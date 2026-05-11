import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { storage } from "../storage";
import { scoreProjectMentorMatches } from "./projectMentorMatcher";

// ── Tool 1: Skills-based semantic search ─────────────────────────────────────
const semanticSearchMentors = tool(
  async ({ projectId }) => {
    const project = await storage.getProject(projectId);
    if (!project) return JSON.stringify({ found: 0, mentorIds: [], mentorProfiles: "" });

    const mentors = await storage.getMentorsWithProfiles();
    const matches = await scoreProjectMentorMatches(project, mentors);

    const mentorProfiles = matches.map((m) => {
      const p = m.mentor.profile;
      return `Mentor ID: ${m.mentor.id} | Name: ${m.mentor.firstName} ${m.mentor.lastName} | Skills: ${p?.skills?.join(", ") ?? "none"} | Experience: ${p?.experienceAreas?.join(", ") ?? "none"} | Score: ${m.score}`;
    }).join("\n");

    return JSON.stringify({ found: matches.length, mentorIds: matches.map((m) => m.mentor.id), mentorProfiles });
  },
  {
    name: "semantic_search_mentors",
    description: "Search for compatible mentors using Gemini embeddings on project skills. Always call this first.",
    schema: z.object({ projectId: z.string() }),
  }
);

// ── Tool 2: LLM-judged description matching ──────────────────────────────────
const descriptionMatchMentors = tool(
  async ({ projectId, excludeMentorIds }) => {
    const project = await storage.getProject(projectId);
    if (!project) return JSON.stringify({ mentorProfiles: "", projectContext: "" });

    const allMentors = await storage.getMentorsWithProfiles();
    const remaining = allMentors.filter((m) => !excludeMentorIds.includes(m.id));

    const mentorProfiles = remaining.map((m) => {
      const p = m.profile;
      return `Mentor ID: ${m.id} | Name: ${m.firstName} ${m.lastName} | Bio: ${p?.bio ?? "N/A"} | Title: ${p?.title ?? "N/A"} | Skills: ${p?.skills?.join(", ") ?? "none"} | Experience: ${p?.experienceAreas?.join(", ") ?? "none"}`;
    }).join("\n---\n");

    const projectContext = [
      `Title: ${project.title}`,
      `Description: ${project.description ?? "N/A"}`,
      `Objectives: ${project.objectives ?? "N/A"}`,
      `Expected Impact: ${project.expectedImpact ?? "N/A"}`,
      `Skills Needed: ${project.skillsNeeded ?? "N/A"}`,
    ].join("\n");

    return JSON.stringify({ mentorProfiles, projectContext, remainingCount: remaining.length });
  },
  {
    name: "description_match_mentors",
    description: `Fetches remaining mentor profiles (not already found) and the project description.
Review the returned text and decide which mentor IDs are a genuine fit for the project.
Then call save_and_notify_mentors with those IDs using source "description".`,
    schema: z.object({
      projectId: z.string(),
      excludeMentorIds: z.array(z.string()).describe("Mentor IDs already found, to skip"),
    }),
  }
);

// ── Tool 3: Past mentors of the project owner ─────────────────────────────────
const getPastMentors = tool(
  async ({ projectId }) => {
    const project = await storage.getProject(projectId);
    if (!project) return JSON.stringify({ found: 0, mentorIds: [], mentorProfiles: "" });

    const pastMentorships = await storage.getMentorshipsByMentee(project.ownerId);
    const relevantMentorships = pastMentorships.filter(
      (m) => m.mentorId && (m.status === "active" || m.status === "completed")
    );

    const uniqueMentorIds = [...new Set(relevantMentorships.map((m) => m.mentorId!))];

    const profiles = await Promise.all(
      uniqueMentorIds.map((id) => storage.getUserWithProfile(id))
    );

    const mentorProfiles = profiles
      .filter(Boolean)
      .map((m) => `Mentor ID: ${m!.id} | Name: ${m!.firstName} ${m!.lastName} | Skills: ${m!.profile?.skills?.join(", ") ?? "none"}`)
      .join("\n");

    return JSON.stringify({ found: uniqueMentorIds.length, mentorIds: uniqueMentorIds, mentorProfiles });
  },
  {
    name: "get_past_mentors",
    description: "Get mentors the project owner has worked with before (past completed or active mentorships).",
    schema: z.object({ projectId: z.string() }),
  }
);

// ── Tool 4: Persist suggestions and update project status ─────────────────────
const saveAndNotifyMentors = tool(
  async ({ projectId, mentorIds, source }) => {
    if (mentorIds.length === 0) return "No mentor IDs provided, nothing saved.";

    await storage.saveProjectMentorSuggestions(projectId, mentorIds, source);

    const allSuggestions = await storage.getProjectMentorSuggestions(projectId);
    const status = allSuggestions.length >= 3 ? "found" : "partial";
    await storage.updateProjectMentorMatchStatus(projectId, status);

    return `Saved ${mentorIds.length} suggestions (source: ${source}). Total suggestions: ${allSuggestions.length}. Status: ${status}.`;
  },
  {
    name: "save_and_notify_mentors",
    description: "Save matched mentor IDs to the project suggestions table and update the project match status.",
    schema: z.object({
      projectId: z.string(),
      mentorIds: z.array(z.string()).describe("Mentor IDs decided as good matches"),
      source: z.enum(["skills", "description", "history"]).describe("How these mentors were found"),
    }),
  }
);

// ── Tool 5: Mark no mentors found ─────────────────────────────────────────────
const markNoMentorsFound = tool(
  async ({ projectId }) => {
    await storage.updateProjectMentorMatchStatus(projectId, "not_found");
    return "Project marked as no mentors found.";
  },
  {
    name: "mark_no_mentors_found",
    description: "Call this when total matched mentors across all rounds is fewer than 3. Sets a flag so the UI shows a recommendation to update project description and skills.",
    schema: z.object({ projectId: z.string() }),
  }
);

// ── Agent ─────────────────────────────────────────────────────────────────────
const llm = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro",
  apiKey: process.env.GEMINI_API_KEY,
});

const agent = createReactAgent({
  llm,
  tools: [semanticSearchMentors, descriptionMatchMentors, getPastMentors, saveAndNotifyMentors, markNoMentorsFound],
});

export async function runMentorMatchingAgent(projectId: string): Promise<void> {
  await storage.updateProjectMentorMatchStatus(projectId, "running");
  try {
    await agent.invoke({
      messages: [{
        role: "user",
        content: `
Find compatible mentors for project ${projectId}. Follow these steps in order:

1. Call semantic_search_mentors to find mentors by skills similarity.
2. If fewer than 3 mentors were found, call description_match_mentors (excluding already found IDs).
   Carefully read the mentor profiles and project description returned.
   Decide which mentors are a genuine fit based on their background — not just keywords.
   Call save_and_notify_mentors with those IDs and source "description".
3. If total is still fewer than 3, call get_past_mentors to find mentors the owner has worked with.
   If any are relevant, call save_and_notify_mentors with source "history".
4. After all rounds, if total saved suggestions is fewer than 3, call mark_no_mentors_found.

Always call save_and_notify_mentors for each round that produces results.
        `.trim(),
      }],
    });
  } catch (err) {
    console.error("[MentorMatchingAgent] Error:", err);
    await storage.updateProjectMentorMatchStatus(projectId, "not_found");
  }
}
