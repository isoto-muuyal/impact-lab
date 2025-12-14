import {
  users,
  userProfiles,
  roles,
  userRoles,
  projects,
  courses,
  courseEnrollments,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and } from "drizzle-orm";

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
  createRole(role: { name: 'usuario' | 'mentor' | 'facilitador'; description?: string }): Promise<Role>;
  
  // UserRole operations
  getUserRoles(userId: string): Promise<(UserRole & { role?: Role })[]>;
  assignRole(userId: string, roleId: string): Promise<UserRole>;
  
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
      .where(eq(roles.name, name as 'usuario' | 'mentor' | 'facilitador'));
    return role;
  }

  async createRole(roleData: { name: 'usuario' | 'mentor' | 'facilitador'; description?: string }): Promise<Role> {
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
    const [userRole] = await db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        isPrimary: 'true',
        status: 'active',
      })
      .returning();
    return userRole;
  }

  // Seed roles
  async seedRoles(): Promise<void> {
    const existingRoles = await this.getRoles();
    
    const rolesToCreate = [
      { name: 'usuario' as const, description: 'Usuario estándar - puede crear proyectos, inscribirse a cursos y solicitar mentoría' },
      { name: 'mentor' as const, description: 'Mentor - guía a emprendedores sociales y revisa proyectos' },
      { name: 'facilitador' as const, description: 'Facilitador - gestiona programas, eventos y supervisa la plataforma' },
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
}

export const storage = new DatabaseStorage();
