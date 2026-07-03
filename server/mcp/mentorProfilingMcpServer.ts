// Standalone MCP server entrypoint — run via `tsx server/mcp/mentorProfilingMcpServer.ts`
// (see MCP_SERVER in .env). Spawned as a stdio subprocess by MentorProfilingAgent, never
// imported by the main app. Do NOT console.log to stdout — it shares the channel with the
// MCP protocol; use console.error for any diagnostics.
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { db } from "../db";
import { mentorProfileDrafts } from "@shared/schema";

const MAX_RESUME_CHARS = 20_000;

function getMentorProfileCvUploadDir(): string {
  return path.resolve(process.cwd(), "uploads", "mentor-profile-cv");
}

function toolResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

const server = new McpServer({ name: "mentor-profiling-mcp-server", version: "1.0.0" });

server.registerTool(
  "parse_resume",
  {
    description: "Extract plain text from an uploaded CV file (PDF or TXT) stored under uploads/mentor-profile-cv.",
    inputSchema: { storageKey: z.string() },
  },
  async ({ storageKey }) => {
    const filePath = path.join(getMentorProfileCvUploadDir(), storageKey);
    const ext = path.extname(storageKey).toLowerCase();

    try {
      let text: string;
      if (ext === ".pdf") {
        const { PDFParse } = await import("pdf-parse");
        const buffer = await fs.readFile(filePath);
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        text = result.text;
      } else if (ext === ".txt" || ext === ".md") {
        text = await fs.readFile(filePath, "utf8");
      } else {
        return toolResult({ error: `Unsupported CV file type: ${ext}` });
      }

      const truncated = text.length > MAX_RESUME_CHARS;
      return toolResult({ text: text.slice(0, MAX_RESUME_CHARS), truncated });
    } catch (error) {
      console.error("[mentorProfilingMcpServer] parse_resume failed:", error);
      return toolResult({ error: "Failed to read or parse the CV file." });
    }
  },
);

server.registerTool(
  "get_profile_draft",
  {
    description: "Fetch the current MicroImpactLab profile draft (status, current step, structured answers so far).",
    inputSchema: { draftId: z.string() },
  },
  async ({ draftId }) => {
    const [draft] = await db.select().from(mentorProfileDrafts).where(eq(mentorProfileDrafts.id, draftId));
    if (!draft) return toolResult({ error: "Draft not found." });
    return toolResult({
      status: draft.status,
      currentStep: draft.currentStep,
      profileData: draft.profileData,
    });
  },
);

server.registerTool(
  "save_profile_section",
  {
    description:
      "Persist a step's answer(s) into the MicroImpactLab profile draft. Call once per meaningfully-answered question. " +
      "Set sectionComplete to true once step 4 (Especialización) of Section 1 has been answered.",
    inputSchema: {
      draftId: z.string(),
      section: z.string().describe("e.g. 'perfil_base'"),
      currentStep: z.number().int().min(1).max(12),
      stepData: z.record(z.string(), z.any()).describe("Structured answer(s) for this step"),
      sectionComplete: z.boolean().default(false),
    },
  },
  async ({ draftId, section, currentStep, stepData, sectionComplete }) => {
    const [existing] = await db.select().from(mentorProfileDrafts).where(eq(mentorProfileDrafts.id, draftId));
    if (!existing) return toolResult({ error: "Draft not found." });

    const profileData = {
      ...(existing.profileData as Record<string, unknown>),
      [`step_${currentStep}`]: { section, ...stepData },
    };

    const [updated] = await db
      .update(mentorProfileDrafts)
      .set({
        profileData,
        currentStep,
        status: sectionComplete ? "section1_complete" : "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(mentorProfileDrafts.id, draftId))
      .returning();

    return toolResult({
      status: updated.status,
      currentStep: updated.currentStep,
      profileData: updated.profileData,
    });
  },
);

server.registerTool(
  "complete_draft",
  {
    description: "Mark the mandatory Section 1 of the MicroImpactLab profile as complete.",
    inputSchema: { draftId: z.string() },
  },
  async ({ draftId }) => {
    const [updated] = await db
      .update(mentorProfileDrafts)
      .set({ status: "section1_complete", updatedAt: new Date() })
      .where(eq(mentorProfileDrafts.id, draftId))
      .returning();
    if (!updated) return toolResult({ error: "Draft not found." });
    return toolResult({ status: updated.status });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[mentorProfilingMcpServer] Fatal error:", error);
  process.exit(1);
});
