import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums for user status and role types
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const roleTypeEnum = pgEnum('role_type', ['usuario', 'mentor', 'facilitador']);
export const profileStatusEnum = pgEnum('profile_status', ['complete', 'incomplete', 'pending']);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - ID 01 User from diagram
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  preferredLanguage: varchar("preferred_language").default('es'),
  timezone: varchar("timezone").default('America/Mexico_City'),
  status: userStatusEnum("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastAccessAt: timestamp("last_access_at"),
});

// User Profile table - ID 02 UserProfile from diagram
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title"),
  bio: text("bio"),
  country: varchar("country"),
  city: varchar("city"),
  languages: text("languages").array(),
  skills: text("skills").array(),
  experienceAreas: text("experience_areas").array(),
  interests: text("interests").array(),
  linkedinUrl: varchar("linkedin_url"),
  profileStatus: profileStatusEnum("profile_status").default('incomplete'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role table - ID 03 Role from diagram
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: roleTypeEnum("name").notNull().unique(),
  description: text("description"),
  authorizationLevel: varchar("authorization_level").default('basic'),
  status: varchar("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UserRole table - ID 04 UserRole from diagram
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  context: varchar("context").default('global'),
  isPrimary: varchar("is_primary").default('true'),
  status: varchar("status").default('active'),
  assignedAt: timestamp("assigned_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  userRoles: many(userRoles),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

// Project status enum
export const projectStatusEnum = pgEnum('project_status', ['draft', 'active', 'completed', 'paused', 'cancelled']);

// Projects table - social impact projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  objectives: text("objectives"),
  targetBeneficiaries: varchar("target_beneficiaries"),
  expectedImpact: text("expected_impact"),
  location: varchar("location"),
  category: varchar("category"),
  status: projectStatusEnum("status").default('draft'),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  mentorId: varchar("mentor_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project relations
export const projectsRelations = relations(projects, ({ one }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [projects.mentorId],
    references: [users.id],
  }),
}));

// Insert schema for projects
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Extended types for frontend use
export type UserWithProfile = User & {
  profile?: UserProfile | null;
  userRoles?: (UserRole & { role?: Role })[];
};

export type ProjectWithOwner = Project & {
  owner?: User;
  mentor?: User | null;
};

// Course status enum
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);

// Enrollment status enum
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['enrolled', 'in_progress', 'completed', 'dropped']);

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  content: text("content"),
  category: varchar("category"),
  difficulty: varchar("difficulty"),
  duration: varchar("duration"),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  status: courseStatusEnum("status").default('draft'),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course enrollments table
export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: enrollmentStatusEnum("status").default('enrolled'),
  progress: varchar("progress").default('0'),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Course relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  enrollments: many(courseEnrollments),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseEnrollments.userId],
    references: [users.id],
  }),
}));

// Insert schemas for courses
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments).omit({
  id: true,
  enrolledAt: true,
});

// Course types
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;

// Extended types
export type CourseWithInstructor = Course & {
  instructor?: User;
};

export type EnrollmentWithCourse = CourseEnrollment & {
  course?: Course;
};

// Mentorship status enum
export const mentorshipStatusEnum = pgEnum('mentorship_status', ['pending', 'active', 'completed', 'cancelled']);

// Mentorship session status enum
export const mentorshipSessionStatusEnum = pgEnum('mentorship_session_status', ['scheduled', 'completed', 'cancelled']);

// Mentorships table
export const mentorships = pgTable("mentorships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menteeId: varchar("mentee_id").notNull().references(() => users.id),
  mentorId: varchar("mentor_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  status: mentorshipStatusEnum("status").default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentorship sessions table
export const mentorshipSessions = pgTable("mentorship_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorshipId: varchar("mentorship_id").notNull().references(() => mentorships.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: varchar("duration"),
  notes: text("notes"),
  status: mentorshipSessionStatusEnum("status").default('scheduled'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship relations
export const mentorshipsRelations = relations(mentorships, ({ one, many }) => ({
  mentee: one(users, {
    fields: [mentorships.menteeId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [mentorships.mentorId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [mentorships.projectId],
    references: [projects.id],
  }),
  sessions: many(mentorshipSessions),
}));

export const mentorshipSessionsRelations = relations(mentorshipSessions, ({ one }) => ({
  mentorship: one(mentorships, {
    fields: [mentorshipSessions.mentorshipId],
    references: [mentorships.id],
  }),
}));

// Insert schemas for mentorships
export const insertMentorshipSchema = createInsertSchema(mentorships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorshipSessionSchema = createInsertSchema(mentorshipSessions).omit({
  id: true,
  createdAt: true,
});

// Mentorship types
export type Mentorship = typeof mentorships.$inferSelect;
export type InsertMentorship = z.infer<typeof insertMentorshipSchema>;

export type MentorshipSession = typeof mentorshipSessions.$inferSelect;
export type InsertMentorshipSession = z.infer<typeof insertMentorshipSessionSchema>;

// Extended types
export type MentorshipWithDetails = Mentorship & {
  mentee?: User;
  mentor?: User | null;
  project?: Project | null;
};

export type MentorshipSessionWithMentorship = MentorshipSession & {
  mentorship?: Mentorship;
};

// ============================================
// ORGANIZATIONS - Allied institutions registry
// ============================================

// Legal status enum for organizations
export const legalStatusEnum = pgEnum('legal_status', [
  'nonprofit', 
  'governmental', 
  'educational', 
  'corporate', 
  'community_based',
  'other'
]);

// Organization membership role enum
export const orgMembershipRoleEnum = pgEnum('org_membership_role', [
  'volunteer_consultant',
  'mentor',
  'project_lead',
  'staff',
  'partner_representative',
  'board_member',
  'advisor',
  'other'
]);

// Organizations table - ORG ID from diagram
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  legalStatus: legalStatusEnum("legal_status"),
  description: text("description"),
  country: varchar("country"),
  city: varchar("city"),
  website: varchar("website"),
  logoUrl: varchar("logo_url"),
  isActive: varchar("is_active").default('true'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization Memberships table - ORG M from diagram
export const organizationMemberships = pgTable("organization_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  role: orgMembershipRoleEnum("role"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isCurrent: varchar("is_current").default('true'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
}));

// Insert schemas for organizations
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Organization types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>;

// Extended types
export type OrganizationWithMemberships = Organization & {
  memberships?: OrganizationMembershipWithUser[];
};

export type OrganizationMembershipWithUser = OrganizationMembership & {
  user?: User;
};

export type OrganizationMembershipWithDetails = OrganizationMembership & {
  user?: User;
  organization?: Organization;
};
