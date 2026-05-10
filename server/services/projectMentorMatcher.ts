import type { ProjectWithOwner, ProjectMentorMatch, UserWithProfile } from "@shared/schema";
import { getEmbeddings, cosineSimilarity } from "./mentorEmbeddings";

const SIMILARITY_THRESHOLD = 0.3;

function normalizeSkills(value: string | null | undefined): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildProjectDocument(project: ProjectWithOwner): string {
  return [project.skillsNeeded, project.description, project.objectives, project.expectedImpact]
    .filter(Boolean)
    .join(" ");
}

function buildMentorDocument(mentor: UserWithProfile): string {
  const p = mentor.profile;
  return [
    p?.skills?.join(" "),
    p?.experienceAreas?.join(" "),
    p?.bio,
    p?.title,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function scoreProjectMentorMatches(
  project: ProjectWithOwner,
  mentors: UserWithProfile[],
): Promise<ProjectMentorMatch[]> {
  if (process.env.GEMINI_API_KEY) {
    return semanticMatches(project, mentors);
  }
  return keywordMatches(project, mentors);
}

async function semanticMatches(
  project: ProjectWithOwner,
  mentors: UserWithProfile[],
): Promise<ProjectMentorMatch[]> {
  const projectDoc = buildProjectDocument(project);
  if (!projectDoc.trim()) return [];

  const eligibleMentors = mentors.filter((m) => buildMentorDocument(m).trim().length > 0);
  if (eligibleMentors.length === 0) return [];

  const docs = [projectDoc, ...eligibleMentors.map(buildMentorDocument)];
  const embeddings = await getEmbeddings(docs);
  const [projectEmbedding, ...mentorEmbeddings] = embeddings;

  const neededSkills = normalizeSkills(project.skillsNeeded);

  const matches = eligibleMentors
    .map((mentor, i) => {
      const similarity = cosineSimilarity(projectEmbedding, mentorEmbeddings[i]);
      if (similarity < SIMILARITY_THRESHOLD) return null;

      const mentorSkills = unique(
        (mentor.profile?.skills ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
      );
      const matchedSkills = neededSkills.filter((s) => mentorSkills.includes(s));

      return {
        mentor,
        score: Math.round(similarity * 100),
        matchedSkills,
        reasons: matchedSkills.map((s) => `Coincide con la habilidad requerida: ${s}`),
      } satisfies ProjectMentorMatch;
    })
    .filter((m): m is ProjectMentorMatch => Boolean(m))
    .sort((a, b) => b.score - a.score);

  return matches;
}

function keywordMatches(
  project: ProjectWithOwner,
  mentors: UserWithProfile[],
): ProjectMentorMatch[] {
  const neededSkills = normalizeSkills(project.skillsNeeded);
  if (neededSkills.length === 0) return [];

  return mentors
    .map((mentor) => {
      const mentorSkills = unique(
        (mentor.profile?.skills ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
      );
      const matchedSkills = neededSkills.filter((s) => mentorSkills.includes(s));
      if (matchedSkills.length === 0) return null;

      return {
        mentor,
        score: matchedSkills.length,
        matchedSkills,
        reasons: matchedSkills.map((s) => `Coincide con la habilidad requerida: ${s}`),
      } satisfies ProjectMentorMatch;
    })
    .filter((m): m is ProjectMentorMatch => Boolean(m))
    .sort((a, b) => b.score - a.score || a.mentor.email!.localeCompare(b.mentor.email!));
}
