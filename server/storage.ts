import {
  users,
  userProfiles,
  roles,
  userRoles,
  projects,
  courses,
  courseEnrollments,
  mentorships,
  mentorshipSessions,
  organizations,
  organizationMemberships,
  challenges,
  challengeProjects,
  projectParticipants,
  matchRecords,
  type User,
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type Role,
  type UserRole,
  type UserWithProfile,
  type Project,
  type InsertProject,
  type ProjectWithOwner,
  type Course,
  type InsertCourse,
  type CourseWithInstructor,
  type CourseEnrollment,
  type InsertCourseEnrollment,
  type EnrollmentWithCourse,
  type Mentorship,
  type InsertMentorship,
  type MentorshipWithDetails,
  type MentorshipSession,
  type InsertMentorshipSession,
  type Organization,
  type InsertOrganization,
  type OrganizationWithMemberships,
  type OrganizationMembership,
  type InsertOrganizationMembership,
  type OrganizationMembershipWithUser,
  type OrganizationMembershipWithDetails,
  type Challenge,
  type InsertChallenge,
  type ChallengeWithDetails,
  type ChallengeProject,
  type InsertChallengeProject,
  type ChallengeProjectWithDetails,
  type ProjectParticipant,
  type InsertProjectParticipant,
  type ProjectParticipantWithUser,
  type ProjectParticipantWithDetails,
  type MatchRecord,
  type InsertMatchRecord,
  type MatchRecordWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and, isNull, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserWithProfile(id: string): Promise<UserWithProfile | undefined>;
  
  // Profile operations
  getProfile(userId: string): Promise<UserProfile | undefined>;
  upsertProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Role operations
  getRoles(): Promise<Role[]>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: { name: 'usuario' | 'mentor' | 'facilitador' | 'proponente' | 'acreditador'; description?: string }): Promise<Role>;
  
  // UserRole operations
  getUserRoles(userId: string): Promise<(UserRole & { role?: Role })[]>;
  assignRole(userId: string, roleId: string): Promise<UserRole>;
  removeRole(userId: string, roleId: string): Promise<boolean>;
  setUserRoles(userId: string, roleIds: string[]): Promise<(UserRole & { role?: Role })[]>;
  
  // Seed operations
  seedRoles(): Promise<void>;
  
  // Project operations
  getProjects(): Promise<ProjectWithOwner[]>;
  getProjectsByOwner(ownerId: string): Promise<ProjectWithOwner[]>;
  getProjectsByMentor(mentorId: string): Promise<ProjectWithOwner[]>;
  getProject(id: string): Promise<ProjectWithOwner | undefined>;
  createProject(project: InsertProject): Promise<ProjectWithOwner>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<ProjectWithOwner | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Course operations
  getCourses(includeUnpublished?: boolean): Promise<CourseWithInstructor[]>;
  getCourse(id: string): Promise<CourseWithInstructor | undefined>;
  createCourse(course: InsertCourse): Promise<CourseWithInstructor>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<CourseWithInstructor | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  
  // Enrollment operations
  getEnrollmentsByUser(userId: string): Promise<EnrollmentWithCourse[]>;
  getEnrollmentsByCourse(courseId: string): Promise<CourseEnrollment[]>;
  getEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined>;
  enrollUser(courseId: string, userId: string): Promise<CourseEnrollment>;
  updateEnrollment(id: string, data: Partial<InsertCourseEnrollment>): Promise<CourseEnrollment | undefined>;
  unenrollUser(courseId: string, userId: string): Promise<boolean>;
  
  // Mentorship operations
  getMentorships(): Promise<MentorshipWithDetails[]>;
  getMentorshipsByMentor(mentorId: string): Promise<MentorshipWithDetails[]>;
  getMentorshipsByMentee(menteeId: string): Promise<MentorshipWithDetails[]>;
  getMentorship(id: string): Promise<MentorshipWithDetails | undefined>;
  createMentorship(mentorship: InsertMentorship): Promise<MentorshipWithDetails>;
  updateMentorship(id: string, data: Partial<InsertMentorship>): Promise<MentorshipWithDetails | undefined>;
  deleteMentorship(id: string): Promise<boolean>;
  
  // Mentorship session operations
  getMentorshipSessions(mentorshipId: string): Promise<MentorshipSession[]>;
  createMentorshipSession(session: InsertMentorshipSession): Promise<MentorshipSession>;
  updateMentorshipSession(id: string, data: Partial<InsertMentorshipSession>): Promise<MentorshipSession | undefined>;
  deleteMentorshipSession(id: string): Promise<boolean>;
  
  // Mentor list for assignments
  getMentors(): Promise<User[]>;
  
  // Organization operations
  getOrganizations(activeOnly?: boolean): Promise<Organization[]>;
  getOrganization(id: string): Promise<OrganizationWithMemberships | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  activateOrganization(id: string): Promise<Organization | undefined>;
  deactivateOrganization(id: string): Promise<Organization | undefined>;
  
  // Organization Membership operations
  getOrganizationMemberships(organizationId: string): Promise<OrganizationMembershipWithUser[]>;
  getMembershipsByUser(userId: string): Promise<OrganizationMembershipWithDetails[]>;
  getOrganizationMembership(id: string): Promise<OrganizationMembershipWithDetails | undefined>;
  createOrganizationMembership(membership: InsertOrganizationMembership): Promise<OrganizationMembership>;
  updateOrganizationMembership(id: string, data: Partial<InsertOrganizationMembership>): Promise<OrganizationMembership | undefined>;
  deleteOrganizationMembership(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Challenge operations
  getChallenges(filters?: { status?: string; organizationId?: string }): Promise<ChallengeWithDetails[]>;
  getChallenge(id: string): Promise<ChallengeWithDetails | undefined>;
  createChallenge(data: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, data: Partial<InsertChallenge>): Promise<Challenge | undefined>;
  deleteChallenge(id: string): Promise<boolean>;
  setChallengeStatus(id: string, status: 'draft' | 'open' | 'in_progress' | 'completed' | 'archived'): Promise<Challenge | undefined>;
  
  // Challenge Project operations
  getChallengeProjects(filters?: { challengeId?: string; status?: string; organizationId?: string }): Promise<ChallengeProjectWithDetails[]>;
  getChallengeProject(id: string): Promise<ChallengeProjectWithDetails | undefined>;
  createChallengeProject(data: InsertChallengeProject): Promise<ChallengeProject>;
  updateChallengeProject(id: string, data: Partial<InsertChallengeProject>): Promise<ChallengeProject | undefined>;
  deleteChallengeProject(id: string): Promise<boolean>;
  setChallengeProjectStatus(id: string, status: 'idea' | 'design' | 'pilot' | 'active' | 'completed' | 'on_hold' | 'cancelled'): Promise<ChallengeProject | undefined>;
  countProjectsByChallenge(challengeId: string): Promise<number>;
  
  // Project Participant operations
  getProjectParticipants(projectId: string): Promise<ProjectParticipantWithUser[]>;
  getParticipantsByUser(userId: string): Promise<ProjectParticipantWithDetails[]>;
  getProjectParticipant(id: string): Promise<ProjectParticipantWithDetails | undefined>;
  createProjectParticipant(data: InsertProjectParticipant): Promise<ProjectParticipant>;
  updateProjectParticipant(id: string, data: Partial<InsertProjectParticipant>): Promise<ProjectParticipant | undefined>;
  deleteProjectParticipant(id: string): Promise<boolean>;
  
  // Match Record operations
  getMatchRecords(filters?: { matchType?: string; status?: string; projectId?: string; challengeId?: string }): Promise<MatchRecordWithDetails[]>;
  getMatchRecord(id: string): Promise<MatchRecordWithDetails | undefined>;
  createMatchRecord(data: InsertMatchRecord): Promise<MatchRecord>;
  updateMatchRecord(id: string, data: Partial<InsertMatchRecord>): Promise<MatchRecord | undefined>;
  deleteMatchRecord(id: string): Promise<boolean>;
  setMatchStatus(id: string, status: 'suggested' | 'pending_approval' | 'accepted' | 'rejected' | 'cancelled', decidedByUserId?: string, notes?: string): Promise<MatchRecord | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
          lastAccessAt: new Date(),
        },
      })
      .returning();
    
    // Assign default role if user is new (no roles assigned)
    const existingRoles = await this.getUserRoles(user.id);
    if (existingRoles.length === 0) {
      const defaultRole = await this.getRoleByName('usuario');
      if (defaultRole) {
        await this.assignRole(user.id, defaultRole.id);
      }
    }
    
    return user;
  }

  async getUserWithProfile(id: string): Promise<UserWithProfile | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const profile = await this.getProfile(id);
    const userRolesWithRole = await this.getUserRoles(id);

    return {
      ...user,
      profile,
      userRoles: userRolesWithRole,
    };
  }

  // Profile operations
  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertProfile(userId: string, profileData: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(userProfiles)
      .values({
        userId,
        ...profileData,
      })
      .returning();
    return created;
  }

  // Role operations
  async getRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name as 'usuario' | 'mentor' | 'facilitador' | 'proponente' | 'acreditador'));
    return role;
  }

  async createRole(roleData: { name: 'usuario' | 'mentor' | 'facilitador' | 'proponente' | 'acreditador'; description?: string }): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  // UserRole operations
  async getUserRoles(userId: string): Promise<(UserRole & { role?: Role })[]> {
    const result = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    const rolesWithDetails = await Promise.all(
      result.map(async (ur) => {
        const [role] = await db
          .select()
          .from(roles)
          .where(eq(roles.id, ur.roleId));
        return { ...ur, role };
      })
    );

    return rolesWithDetails;
  }

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    // Check if already assigned
    const existing = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [userRole] = await db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        isPrimary: 'false',
        status: 'active',
      })
      .returning();
    return userRole;
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    return true;
  }

  async setUserRoles(userId: string, roleIds: string[]): Promise<(UserRole & { role?: Role })[]> {
    // Remove all existing roles
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    
    // Assign new roles
    for (const roleId of roleIds) {
      await this.assignRole(userId, roleId);
    }
    
    return this.getUserRoles(userId);
  }

  // Seed roles
  async seedRoles(): Promise<void> {
    const existingRoles = await this.getRoles();
    
    const rolesToCreate = [
      { name: 'usuario' as const, description: 'Usuario estándar - acceso básico a la plataforma' },
      { name: 'mentor' as const, description: 'Mentor - puede crear mentorías, ejecutarlas y elegir proyectos para ser mentor' },
      { name: 'facilitador' as const, description: 'Facilitador - puede crear cursos y subir videos educativos' },
      { name: 'proponente' as const, description: 'Proponente - puede crear proyectos, buscar mentores e inscribirse a cursos' },
      { name: 'acreditador' as const, description: 'Acreditador - instituto que certifica cursos y mentorías' },
    ];

    for (const roleData of rolesToCreate) {
      const exists = existingRoles.find(r => r.name === roleData.name);
      if (!exists) {
        await this.createRole(roleData);
      }
    }
  }

  // Project operations
  async getProjects(): Promise<ProjectWithOwner[]> {
    const projectList = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
    
    const projectsWithOwners = await Promise.all(
      projectList.map(async (project) => {
        const owner = await this.getUser(project.ownerId);
        const mentor = project.mentorId ? await this.getUser(project.mentorId) : null;
        return { ...project, owner, mentor };
      })
    );
    
    return projectsWithOwners;
  }

  async getProjectsByOwner(ownerId: string): Promise<ProjectWithOwner[]> {
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, ownerId))
      .orderBy(desc(projects.createdAt));
    
    const projectsWithOwners = await Promise.all(
      projectList.map(async (project) => {
        const owner = await this.getUser(project.ownerId);
        const mentor = project.mentorId ? await this.getUser(project.mentorId) : null;
        return { ...project, owner, mentor };
      })
    );
    
    return projectsWithOwners;
  }

  async getProjectsByMentor(mentorId: string): Promise<ProjectWithOwner[]> {
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.mentorId, mentorId))
      .orderBy(desc(projects.createdAt));
    
    const projectsWithOwners = await Promise.all(
      projectList.map(async (project) => {
        const owner = await this.getUser(project.ownerId);
        const mentor = project.mentorId ? await this.getUser(project.mentorId) : null;
        return { ...project, owner, mentor };
      })
    );
    
    return projectsWithOwners;
  }

  async getProject(id: string): Promise<ProjectWithOwner | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    
    if (!project) return undefined;
    
    const owner = await this.getUser(project.ownerId);
    const mentor = project.mentorId ? await this.getUser(project.mentorId) : null;
    
    return { ...project, owner, mentor };
  }

  async createProject(projectData: InsertProject): Promise<ProjectWithOwner> {
    const [project] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    
    const owner = await this.getUser(project.ownerId);
    const mentor = project.mentorId ? await this.getUser(project.mentorId) : null;
    
    return { ...project, owner, mentor };
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<ProjectWithOwner | undefined> {
    const [project] = await db
      .update(projects)
      .set({
        ...projectData,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    
    if (!project) return undefined;
    
    const owner = await this.getUser(project.ownerId);
    const mentor = project.mentorId ? await this.getUser(project.mentorId) : null;
    
    return { ...project, owner, mentor };
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id));
    return true;
  }

  // Course operations
  async getCourses(includeUnpublished: boolean = false): Promise<CourseWithInstructor[]> {
    let courseList;
    if (includeUnpublished) {
      courseList = await db
        .select()
        .from(courses)
        .orderBy(desc(courses.createdAt));
    } else {
      courseList = await db
        .select()
        .from(courses)
        .where(eq(courses.status, 'published'))
        .orderBy(desc(courses.createdAt));
    }
    
    const coursesWithInstructors = await Promise.all(
      courseList.map(async (course) => {
        const instructor = await this.getUser(course.instructorId);
        return { ...course, instructor };
      })
    );
    
    return coursesWithInstructors;
  }

  async getCourse(id: string): Promise<CourseWithInstructor | undefined> {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    
    if (!course) return undefined;
    
    const instructor = await this.getUser(course.instructorId);
    return { ...course, instructor };
  }

  async createCourse(courseData: InsertCourse): Promise<CourseWithInstructor> {
    const [course] = await db
      .insert(courses)
      .values(courseData)
      .returning();
    
    const instructor = await this.getUser(course.instructorId);
    return { ...course, instructor };
  }

  async updateCourse(id: string, courseData: Partial<InsertCourse>): Promise<CourseWithInstructor | undefined> {
    const [course] = await db
      .update(courses)
      .set({
        ...courseData,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();
    
    if (!course) return undefined;
    
    const instructor = await this.getUser(course.instructorId);
    return { ...course, instructor };
  }

  async deleteCourse(id: string): Promise<boolean> {
    await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, id));
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  // Enrollment operations
  async getEnrollmentsByUser(userId: string): Promise<EnrollmentWithCourse[]> {
    const enrollments = await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(desc(courseEnrollments.enrolledAt));
    
    const enrollmentsWithCourses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const [course] = await db
          .select()
          .from(courses)
          .where(eq(courses.id, enrollment.courseId));
        return { ...enrollment, course };
      })
    );
    
    return enrollmentsWithCourses;
  }

  async getEnrollmentsByCourse(courseId: string): Promise<CourseEnrollment[]> {
    return db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId));
  }

  async getEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.userId, userId)
      ));
    return enrollment;
  }

  async enrollUser(courseId: string, userId: string): Promise<CourseEnrollment> {
    const [enrollment] = await db
      .insert(courseEnrollments)
      .values({
        courseId,
        userId,
        status: 'enrolled',
        progress: '0',
      })
      .returning();
    return enrollment;
  }

  async updateEnrollment(id: string, data: Partial<InsertCourseEnrollment>): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db
      .update(courseEnrollments)
      .set(data)
      .where(eq(courseEnrollments.id, id))
      .returning();
    return enrollment;
  }

  async unenrollUser(courseId: string, userId: string): Promise<boolean> {
    await db
      .delete(courseEnrollments)
      .where(and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.userId, userId)
      ));
    return true;
  }

  // Mentorship operations
  private async enrichMentorship(mentorship: Mentorship): Promise<MentorshipWithDetails> {
    const mentee = await this.getUser(mentorship.menteeId);
    const mentor = mentorship.mentorId ? await this.getUser(mentorship.mentorId) : null;
    let project = null;
    if (mentorship.projectId) {
      const [proj] = await db.select().from(projects).where(eq(projects.id, mentorship.projectId));
      project = proj || null;
    }
    return { ...mentorship, mentee, mentor, project };
  }

  async getMentorships(): Promise<MentorshipWithDetails[]> {
    const mentorshipList = await db
      .select()
      .from(mentorships)
      .orderBy(desc(mentorships.createdAt));
    
    return Promise.all(mentorshipList.map(m => this.enrichMentorship(m)));
  }

  async getMentorshipsByMentor(mentorId: string): Promise<MentorshipWithDetails[]> {
    const mentorshipList = await db
      .select()
      .from(mentorships)
      .where(eq(mentorships.mentorId, mentorId))
      .orderBy(desc(mentorships.createdAt));
    
    return Promise.all(mentorshipList.map(m => this.enrichMentorship(m)));
  }

  async getMentorshipsByMentee(menteeId: string): Promise<MentorshipWithDetails[]> {
    const mentorshipList = await db
      .select()
      .from(mentorships)
      .where(eq(mentorships.menteeId, menteeId))
      .orderBy(desc(mentorships.createdAt));
    
    return Promise.all(mentorshipList.map(m => this.enrichMentorship(m)));
  }

  async getMentorship(id: string): Promise<MentorshipWithDetails | undefined> {
    const [mentorship] = await db
      .select()
      .from(mentorships)
      .where(eq(mentorships.id, id));
    
    if (!mentorship) return undefined;
    return this.enrichMentorship(mentorship);
  }

  async createMentorship(data: InsertMentorship): Promise<MentorshipWithDetails> {
    const [mentorship] = await db
      .insert(mentorships)
      .values(data)
      .returning();
    
    return this.enrichMentorship(mentorship);
  }

  async updateMentorship(id: string, data: Partial<InsertMentorship>): Promise<MentorshipWithDetails | undefined> {
    const [mentorship] = await db
      .update(mentorships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mentorships.id, id))
      .returning();
    
    if (!mentorship) return undefined;
    return this.enrichMentorship(mentorship);
  }

  async deleteMentorship(id: string): Promise<boolean> {
    await db.delete(mentorshipSessions).where(eq(mentorshipSessions.mentorshipId, id));
    await db.delete(mentorships).where(eq(mentorships.id, id));
    return true;
  }

  // Mentorship session operations
  async getMentorshipSessions(mentorshipId: string): Promise<MentorshipSession[]> {
    return db
      .select()
      .from(mentorshipSessions)
      .where(eq(mentorshipSessions.mentorshipId, mentorshipId))
      .orderBy(desc(mentorshipSessions.scheduledAt));
  }

  async createMentorshipSession(data: InsertMentorshipSession): Promise<MentorshipSession> {
    const [session] = await db
      .insert(mentorshipSessions)
      .values(data)
      .returning();
    return session;
  }

  async updateMentorshipSession(id: string, data: Partial<InsertMentorshipSession>): Promise<MentorshipSession | undefined> {
    const [session] = await db
      .update(mentorshipSessions)
      .set(data)
      .where(eq(mentorshipSessions.id, id))
      .returning();
    return session;
  }

  async deleteMentorshipSession(id: string): Promise<boolean> {
    await db.delete(mentorshipSessions).where(eq(mentorshipSessions.id, id));
    return true;
  }

  // Get all users with mentor role
  async getMentors(): Promise<User[]> {
    const mentorRole = await this.getRoleByName('mentor');
    if (!mentorRole) return [];
    
    const mentorUserRoles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.roleId, mentorRole.id));
    
    const mentors = await Promise.all(
      mentorUserRoles.map(async (ur) => {
        const user = await this.getUser(ur.userId);
        return user;
      })
    );
    
    return mentors.filter((u): u is User => u !== undefined);
  }

  // Organization operations
  async getOrganizations(activeOnly: boolean = false): Promise<Organization[]> {
    if (activeOnly) {
      return db
        .select()
        .from(organizations)
        .where(eq(organizations.isActive, 'true'))
        .orderBy(desc(organizations.createdAt));
    }
    return db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.createdAt));
  }

  async getOrganization(id: string): Promise<OrganizationWithMemberships | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    
    if (!org) return undefined;
    
    const memberships = await this.getOrganizationMemberships(id);
    return { ...org, memberships };
  }

  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(orgData)
      .returning();
    return org;
  }

  async updateOrganization(id: string, orgData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({
        ...orgData,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async activateOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ isActive: 'true', updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async deactivateOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ isActive: 'false', updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  // Organization Membership operations
  async getOrganizationMemberships(organizationId: string): Promise<OrganizationMembershipWithUser[]> {
    const memberships = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, organizationId))
      .orderBy(desc(organizationMemberships.createdAt));
    
    const membershipsWithUsers = await Promise.all(
      memberships.map(async (m) => {
        const user = await this.getUser(m.userId);
        return { ...m, user };
      })
    );
    
    return membershipsWithUsers;
  }

  async getMembershipsByUser(userId: string): Promise<OrganizationMembershipWithDetails[]> {
    const memberships = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .orderBy(desc(organizationMemberships.createdAt));
    
    const membershipsWithDetails = await Promise.all(
      memberships.map(async (m) => {
        const user = await this.getUser(m.userId);
        const [org] = await db.select().from(organizations).where(eq(organizations.id, m.organizationId));
        return { ...m, user, organization: org };
      })
    );
    
    return membershipsWithDetails;
  }

  async getOrganizationMembership(id: string): Promise<OrganizationMembershipWithDetails | undefined> {
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.id, id));
    
    if (!membership) return undefined;
    
    const user = await this.getUser(membership.userId);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, membership.organizationId));
    
    return { ...membership, user, organization: org };
  }

  async createOrganizationMembership(data: InsertOrganizationMembership): Promise<OrganizationMembership> {
    const [membership] = await db
      .insert(organizationMemberships)
      .values(data)
      .returning();
    return membership;
  }

  async updateOrganizationMembership(id: string, data: Partial<InsertOrganizationMembership>): Promise<OrganizationMembership | undefined> {
    const [membership] = await db
      .update(organizationMemberships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizationMemberships.id, id))
      .returning();
    return membership;
  }

  async deleteOrganizationMembership(id: string): Promise<boolean> {
    await db.delete(organizationMemberships).where(eq(organizationMemberships.id, id));
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  // ============================================
  // CHALLENGE OPERATIONS
  // ============================================
  
  private async enrichChallenge(challenge: Challenge): Promise<ChallengeWithDetails> {
    let contextOrganization = null;
    let createdBy = null;
    
    if (challenge.contextOrganizationId) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, challenge.contextOrganizationId));
      contextOrganization = org || null;
    }
    if (challenge.createdByUserId) {
      createdBy = await this.getUser(challenge.createdByUserId) || null;
    }
    
    return { ...challenge, contextOrganization, createdBy };
  }

  async getChallenges(filters?: { status?: string; organizationId?: string }): Promise<ChallengeWithDetails[]> {
    let query = db.select().from(challenges).orderBy(desc(challenges.createdAt));
    
    const challengeList = await query;
    
    let filtered = challengeList;
    if (filters?.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    if (filters?.organizationId) {
      filtered = filtered.filter(c => c.contextOrganizationId === filters.organizationId);
    }
    
    return Promise.all(filtered.map(c => this.enrichChallenge(c)));
  }

  async getChallenge(id: string): Promise<ChallengeWithDetails | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    if (!challenge) return undefined;
    return this.enrichChallenge(challenge);
  }

  async createChallenge(data: InsertChallenge): Promise<Challenge> {
    const [challenge] = await db.insert(challenges).values(data).returning();
    return challenge;
  }

  async updateChallenge(id: string, data: Partial<InsertChallenge>): Promise<Challenge | undefined> {
    const [challenge] = await db
      .update(challenges)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(challenges.id, id))
      .returning();
    return challenge;
  }

  async deleteChallenge(id: string): Promise<boolean> {
    await db.delete(challenges).where(eq(challenges.id, id));
    return true;
  }

  async setChallengeStatus(id: string, status: 'draft' | 'open' | 'in_progress' | 'completed' | 'archived'): Promise<Challenge | undefined> {
    const [challenge] = await db
      .update(challenges)
      .set({ status, updatedAt: new Date() })
      .where(eq(challenges.id, id))
      .returning();
    return challenge;
  }

  // ============================================
  // CHALLENGE PROJECT OPERATIONS
  // ============================================
  
  private async enrichChallengeProject(project: ChallengeProject): Promise<ChallengeProjectWithDetails> {
    let challenge = null;
    let leadOrganization = null;
    let createdBy = null;
    
    if (project.challengeId) {
      const [ch] = await db.select().from(challenges).where(eq(challenges.id, project.challengeId));
      challenge = ch || null;
    }
    if (project.leadOrganizationId) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, project.leadOrganizationId));
      leadOrganization = org || null;
    }
    if (project.createdByUserId) {
      createdBy = await this.getUser(project.createdByUserId) || null;
    }
    
    const participants = await this.getProjectParticipants(project.id);
    
    return { ...project, challenge, leadOrganization, createdBy, participants };
  }

  async getChallengeProjects(filters?: { challengeId?: string; status?: string; organizationId?: string }): Promise<ChallengeProjectWithDetails[]> {
    const projectList = await db.select().from(challengeProjects).orderBy(desc(challengeProjects.createdAt));
    
    let filtered = projectList;
    if (filters?.challengeId) {
      filtered = filtered.filter(p => p.challengeId === filters.challengeId);
    }
    if (filters?.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters?.organizationId) {
      filtered = filtered.filter(p => p.leadOrganizationId === filters.organizationId);
    }
    
    return Promise.all(filtered.map(p => this.enrichChallengeProject(p)));
  }

  async getChallengeProject(id: string): Promise<ChallengeProjectWithDetails | undefined> {
    const [project] = await db.select().from(challengeProjects).where(eq(challengeProjects.id, id));
    if (!project) return undefined;
    return this.enrichChallengeProject(project);
  }

  async createChallengeProject(data: InsertChallengeProject): Promise<ChallengeProject> {
    const [project] = await db.insert(challengeProjects).values(data).returning();
    return project;
  }

  async updateChallengeProject(id: string, data: Partial<InsertChallengeProject>): Promise<ChallengeProject | undefined> {
    const [project] = await db
      .update(challengeProjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(challengeProjects.id, id))
      .returning();
    return project;
  }

  async deleteChallengeProject(id: string): Promise<boolean> {
    await db.delete(projectParticipants).where(eq(projectParticipants.projectId, id));
    await db.delete(challengeProjects).where(eq(challengeProjects.id, id));
    return true;
  }

  async setChallengeProjectStatus(id: string, status: 'idea' | 'design' | 'pilot' | 'active' | 'completed' | 'on_hold' | 'cancelled'): Promise<ChallengeProject | undefined> {
    const [project] = await db
      .update(challengeProjects)
      .set({ status, updatedAt: new Date() })
      .where(eq(challengeProjects.id, id))
      .returning();
    return project;
  }

  async countProjectsByChallenge(challengeId: string): Promise<number> {
    const projects = await db
      .select()
      .from(challengeProjects)
      .where(eq(challengeProjects.challengeId, challengeId));
    return projects.length;
  }

  // ============================================
  // PROJECT PARTICIPANT OPERATIONS
  // ============================================
  
  async getProjectParticipants(projectId: string): Promise<ProjectParticipantWithUser[]> {
    const participants = await db
      .select()
      .from(projectParticipants)
      .where(eq(projectParticipants.projectId, projectId))
      .orderBy(desc(projectParticipants.createdAt));
    
    const participantsWithUsers = await Promise.all(
      participants.map(async (p) => {
        const user = await this.getUser(p.userId);
        return { ...p, user };
      })
    );
    
    return participantsWithUsers;
  }

  async getParticipantsByUser(userId: string): Promise<ProjectParticipantWithDetails[]> {
    const participants = await db
      .select()
      .from(projectParticipants)
      .where(eq(projectParticipants.userId, userId))
      .orderBy(desc(projectParticipants.createdAt));
    
    const participantsWithDetails = await Promise.all(
      participants.map(async (p) => {
        const user = await this.getUser(p.userId);
        const [project] = await db.select().from(challengeProjects).where(eq(challengeProjects.id, p.projectId));
        return { ...p, user, project };
      })
    );
    
    return participantsWithDetails;
  }

  async getProjectParticipant(id: string): Promise<ProjectParticipantWithDetails | undefined> {
    const [participant] = await db
      .select()
      .from(projectParticipants)
      .where(eq(projectParticipants.id, id));
    
    if (!participant) return undefined;
    
    const user = await this.getUser(participant.userId);
    const [project] = await db.select().from(challengeProjects).where(eq(challengeProjects.id, participant.projectId));
    
    return { ...participant, user, project };
  }

  async createProjectParticipant(data: InsertProjectParticipant): Promise<ProjectParticipant> {
    const [participant] = await db.insert(projectParticipants).values(data).returning();
    return participant;
  }

  async updateProjectParticipant(id: string, data: Partial<InsertProjectParticipant>): Promise<ProjectParticipant | undefined> {
    const [participant] = await db
      .update(projectParticipants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectParticipants.id, id))
      .returning();
    return participant;
  }

  async deleteProjectParticipant(id: string): Promise<boolean> {
    await db.delete(projectParticipants).where(eq(projectParticipants.id, id));
    return true;
  }

  // ============================================
  // MATCH RECORD OPERATIONS
  // ============================================
  
  private async enrichMatchRecord(match: MatchRecord): Promise<MatchRecordWithDetails> {
    let challenge = null;
    let project = null;
    let organization = null;
    let professionalUser = null;
    let decidedBy = null;
    
    if (match.challengeId) {
      const [ch] = await db.select().from(challenges).where(eq(challenges.id, match.challengeId));
      challenge = ch || null;
    }
    if (match.projectId) {
      const [proj] = await db.select().from(challengeProjects).where(eq(challengeProjects.id, match.projectId));
      project = proj || null;
    }
    if (match.organizationId) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, match.organizationId));
      organization = org || null;
    }
    if (match.professionalUserId) {
      professionalUser = await this.getUser(match.professionalUserId) || null;
    }
    if (match.decidedByUserId) {
      decidedBy = await this.getUser(match.decidedByUserId) || null;
    }
    
    return { ...match, challenge, project, organization, professionalUser, decidedBy };
  }

  async getMatchRecords(filters?: { matchType?: string; status?: string; projectId?: string; challengeId?: string }): Promise<MatchRecordWithDetails[]> {
    const matchList = await db.select().from(matchRecords).orderBy(desc(matchRecords.createdAt));
    
    let filtered = matchList;
    if (filters?.matchType) {
      filtered = filtered.filter(m => m.matchType === filters.matchType);
    }
    if (filters?.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }
    if (filters?.projectId) {
      filtered = filtered.filter(m => m.projectId === filters.projectId);
    }
    if (filters?.challengeId) {
      filtered = filtered.filter(m => m.challengeId === filters.challengeId);
    }
    
    return Promise.all(filtered.map(m => this.enrichMatchRecord(m)));
  }

  async getMatchRecord(id: string): Promise<MatchRecordWithDetails | undefined> {
    const [match] = await db.select().from(matchRecords).where(eq(matchRecords.id, id));
    if (!match) return undefined;
    return this.enrichMatchRecord(match);
  }

  async createMatchRecord(data: InsertMatchRecord): Promise<MatchRecord> {
    const [match] = await db.insert(matchRecords).values(data).returning();
    return match;
  }

  async updateMatchRecord(id: string, data: Partial<InsertMatchRecord>): Promise<MatchRecord | undefined> {
    const [match] = await db
      .update(matchRecords)
      .set(data)
      .where(eq(matchRecords.id, id))
      .returning();
    return match;
  }

  async deleteMatchRecord(id: string): Promise<boolean> {
    await db.delete(matchRecords).where(eq(matchRecords.id, id));
    return true;
  }

  async setMatchStatus(
    id: string, 
    status: 'suggested' | 'pending_approval' | 'accepted' | 'rejected' | 'cancelled',
    decidedByUserId?: string,
    notes?: string
  ): Promise<MatchRecord | undefined> {
    const updateData: any = { status };
    
    if (status === 'accepted' || status === 'rejected' || status === 'cancelled') {
      updateData.decidedAt = new Date();
      if (decidedByUserId) {
        updateData.decidedByUserId = decidedByUserId;
      }
    }
    
    if (notes) {
      updateData.notes = notes;
    }
    
    const [match] = await db
      .update(matchRecords)
      .set(updateData)
      .where(eq(matchRecords.id, id))
      .returning();
    return match;
  }
}

export const storage = new DatabaseStorage();
