import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { BaseMessage } from "@langchain/core/messages";
import { storage } from "../storage";
import type { MentorProfileDraft } from "@shared/schema";

// The exact MicroImpactLab strategic-profiling script the agent walks the user through.
// Section 1 (Pasos 1-4) is mandatory and gates hand-off into the mentor role request;
// Sections 2-3 are deferred for a future iteration (see plan scope boundary).
const SYSTEM_PROMPT = `
Welcome to ImpactLab by GA4SI.

Eres el asistente de perfilamiento estratégico de ImpactLab. Tu tarea es guiar a la persona
usuaria a través del proceso de "MicroImpactLab" combinando el contenido de su CV con sus
respuestas a un cuestionario fijo, y guardar el resultado estructurado usando las herramientas
disponibles.

Checklist de referencia (solo la Sección 1 es obligatoria en esta conversación):

SECCIÓN 1 — PERFIL BASE DEL MICROIMPACTLAB (Obligatoria)
⬜ Paso 1. Análisis del perfil profesional
⬜ Paso 2. Identidad del MicroImpactLab
⬜ Paso 3. Propósito y propuesta de valor
⬜ Paso 4. Especialización y problemas que resuelve

Instrucciones:
1. Al iniciar, llama a get_profile_draft para conocer el estado actual. Si ya hay pasos
   guardados, continúa donde se quedó la conversación en vez de reiniciar.
2. Si el mensaje del usuario incluye una nota de sistema con un CV adjunto (storageKey), y
   aún no lo has hecho en esta conversación, llama a parse_resume con ese storageKey y usa el
   texto extraído como contexto. No lo llames más de una vez por conversación.
3. Preséntate con el mensaje de bienvenida de arriba y explica brevemente el proceso.
4. Luego, haz UNA PREGUNTA A LA VEZ (espera la respuesta antes de continuar) de este cuestionario
   fijo, en español, respetando el formato de opciones:

1. ¿Cuál es la misión principal que deseas que tenga tu MicroImpactLab?
A) Mentoría tecnológica
B) Transformación digital
C) IA aplicada a organizaciones
D) Desarrollo profesional y liderazgo técnico
E) Otro

2. ¿Qué tipo de impacto te interesa generar principalmente?
A) Social
B) Educativo
C) Empresarial
D) Comunitario
E) Combinación de varios

3. ¿Qué actividad disfrutas más realizar?
A) Mentorías 1:1
B) Workshops
C) Consultoría estratégica
D) Construcción de productos
E) Facilitación de comunidades

4. ¿Quién es tu audiencia principal ideal?
A) Desarrolladores
B) Líderes técnicos
C) Emprendedores
D) Organizaciones con impacto social
E) Profesionales en transición tecnológica

5. Cuando alguien trabaja contigo, ¿qué transformación te gustaría que experimente?

6. ¿Qué experiencia consideras más valiosa de tu trayectoria?
A) Infraestructura empresarial
B) Liderazgo técnico
C) Desarrollo backend
D) Automatización y calidad
E) IA aplicada
F) Integración de todas las anteriores

7. ¿Te interesa ofrecer mentorías dentro del ecosistema? (Sí / No / Tal vez)

8. ¿Te interesa desarrollar cursos o programas formativos? (Sí / No / Más adelante)

9. ¿Qué papel te gustaría desempeñar dentro de proyectos colaborativos?
A) Mentor
B) Arquitecto de soluciones
C) Estratega
D) Facilitador
E) Colaborador técnico

10. Dentro de cinco años, ¿cómo te gustaría que las personas describieran tu contribución profesional?

5. Una vez tengas las 10 respuestas y el contenido del CV, sintetiza y guarda, EN ORDEN, los
   cuatro pasos obligatorios llamando a save_profile_section una vez por paso:
   - currentStep=1, section="perfil_base": síntesis breve del perfil profesional (CV + respuestas).
   - currentStep=2, section="perfil_base": identidad propuesta para su MicroImpactLab (nombre, tagline).
   - currentStep=3, section="perfil_base": propósito y propuesta de valor.
   - currentStep=4, section="perfil_base", sectionComplete=true: especialización y problemas que resuelve.
   Después de cada llamada, muestra brevemente al usuario lo que quedó guardado para ese paso.
6. Al guardar el paso 4 con sectionComplete=true, informa al usuario que la Sección 1 está
   completa y que puede continuar para enviar su solicitud de rol de mentor.
7. Responde siempre en español, con un tono cercano y profesional.
`.trim();

type ChecklistItem = {
  section: 1 | 2 | 3;
  step: number;
  label: string;
  done: boolean;
};

const CHECKLIST_STEPS: { section: 1 | 2 | 3; step: number; label: string }[] = [
  { section: 1, step: 1, label: "Análisis del perfil profesional" },
  { section: 1, step: 2, label: "Identidad del MicroImpactLab" },
  { section: 1, step: 3, label: "Propósito y propuesta de valor" },
  { section: 1, step: 4, label: "Especialización y problemas que resuelve" },
  { section: 2, step: 5, label: "Audiencias y ecosistemas" },
  { section: 2, step: 6, label: "LearningLab" },
  { section: 2, step: 7, label: "CoLab" },
  { section: 2, step: 8, label: "Desarrollo personal y emprendimiento" },
  { section: 3, step: 9, label: "Casos y experiencia aplicada" },
  { section: 3, step: 10, label: "Recursos y herramientas" },
  { section: 3, step: 11, label: "Posicionamiento estratégico" },
  { section: 3, step: 12, label: "Servicios escalables" },
];

function buildChecklist(draft: MentorProfileDraft): ChecklistItem[] {
  const profileData = (draft.profileData ?? {}) as Record<string, unknown>;
  return CHECKLIST_STEPS.map((item) => ({
    ...item,
    done: Boolean(profileData[`step_${item.step}`]),
  }));
}

export class MentorProfilingAgent {
  private client: Client | null = null;
  private reactAgent: ReturnType<typeof createReactAgent> | null = null;
  private connecting: Promise<void> | null = null;

  private async ensureConnected(): Promise<void> {
    if (this.reactAgent) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const mcpServerCommand = process.env.MCP_SERVER;
      if (!mcpServerCommand) {
        throw new Error("MCP_SERVER environment variable is not set — cannot start the mentor profiling MCP server.");
      }

      const [command, ...args] = mcpServerCommand.split(" ");
      const env: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) env[key] = value;
      }

      const transport = new StdioClientTransport({ command, args, env, cwd: process.cwd() });
      const client = new Client({ name: "impact-lab-mentor-profiling", version: "1.0.0" });
      await client.connect(transport);

      const tools = await loadMcpTools("mentor-profiling", client);
      const llm = new ChatGoogleGenerativeAI({
        model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro",
        apiKey: process.env.GEMINI_API_KEY,
      });

      this.client = client;
      this.reactAgent = createReactAgent({ llm, tools, prompt: SYSTEM_PROMPT });
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async sendMessage(
    userId: string,
    draftId: string,
    userMessage: string,
    cvAttachment?: { storageKey: string; fileName: string },
  ): Promise<{ reply: string; draft: MentorProfileDraft; checklist: ChecklistItem[] }> {
    try {
      await this.ensureConnected();

      await storage.addMentorProfileChatMessage({ draftId, role: "user", content: userMessage });
      const priorMessages = await storage.getMentorProfileChatMessages(draftId);
      const messages: { role: "user" | "assistant" | "system"; content: string }[] = priorMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      if (cvAttachment) {
        messages.push({
          role: "system",
          content: `[CV adjunto disponible. storageKey="${cvAttachment.storageKey}", fileName="${cvAttachment.fileName}". Si aún no lo has revisado en esta conversación, llama a parse_resume con este storageKey antes de continuar.]`,
        });
      }

      const result = await this.reactAgent!.invoke({ messages });
      const resultMessages = result.messages as BaseMessage[];
      const last = resultMessages[resultMessages.length - 1];
      const reply = typeof last.content === "string" ? last.content : JSON.stringify(last.content);

      await storage.addMentorProfileChatMessage({ draftId, role: "assistant", content: reply });

      const draft = await storage.getMentorProfileDraft(draftId, userId);
      if (!draft) throw new Error("Mentor profile draft not found after agent run.");

      return { reply, draft, checklist: buildChecklist(draft) };
    } catch (error) {
      this.client = null;
      this.reactAgent = null;
      throw error;
    }
  }
}

export const mentorProfilingAgent = new MentorProfilingAgent();
