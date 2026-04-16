import type { ProjectWithOwner, ProjectMentorMatch, UserWithProfile } from "@shared/schema";

function normalizeSkills(value: string | null | undefined): string[] {
  return (value || "")
    .split(",")
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function scoreProjectMentorMatches(
  project: ProjectWithOwner,
  mentors: UserWithProfile[],
): ProjectMentorMatch[] {
  const neededSkills = normalizeSkills(project.skillsNeeded);
  if (neededSkills.length === 0) {
    return [];
  }

  const matches = mentors
    .map((mentor) => {
      const mentorSkills = unique((mentor.profile?.skills || []).map((skill) => skill.trim().toLowerCase()).filter(Boolean));
      const matchedSkills = neededSkills.filter((skill) => mentorSkills.includes(skill));

      if (matchedSkills.length === 0) {
        return null;
      }

      return {
        mentor,
        score: matchedSkills.length,
        matchedSkills,
        reasons: matchedSkills.map((skill) => `Coincide con la habilidad requerida: ${skill}`),
      } satisfies ProjectMentorMatch;
    })
    .filter((match): match is ProjectMentorMatch => Boolean(match))
    .sort((a, b) => b.score - a.score || a.mentor.email!.localeCompare(b.mentor.email!));

  return matches;
}
