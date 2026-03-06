import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  pgEnum,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums for user status and role types
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const roleTypeEnum = pgEnum('role_type', ['usuario', 'mentor', 'facilitador', 'proponente', 'acreditador']);
export const profileStatusEnum = pgEnum('profile_status', ['complete', 'incomplete', 'pending']);
export const activityTypeEnum = pgEnum('activity_type', ['page_view', 'button_click']);

// Session storage table.
// (IMPORTANT) This table is required for session auth, don't drop it.
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
// (IMPORTANT) This table is required for auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  password: varchar("password"),
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

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  activityType: activityTypeEnum("activity_type").notNull(),
  path: varchar("path").notNull(),
  buttonId: varchar("button_id"),
  buttonLabel: varchar("button_label"),
  ipAddress: varchar("ip_address"),
  country: varchar("country"),
  region: varchar("region"),
  city: varchar("city"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
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

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
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

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

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

// Course status enum - Updated per class diagram: draft, open, ongoing, completed, archived
export const courseStatusEnum = pgEnum('course_status', ['draft', 'open', 'ongoing', 'completed', 'archived']);

// Course modality enum - online, presencial, híbrido, asíncrono, síncrono
export const courseModalityEnum = pgEnum('course_modality', ['online', 'presencial', 'hibrido', 'asincrono', 'sincrono']);

// Course level enum - introductorio, intermedio, avanzado
export const courseLevelEnum = pgEnum('course_level', ['introductorio', 'intermedio', 'avanzado']);

// Enrollment status enum
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['enrolled', 'in_progress', 'completed', 'dropped']);

// Module content type enum - video, reading, workbook, assignment, liveSession
export const moduleContentTypeEnum = pgEnum('module_content_type', ['video', 'reading', 'workbook', 'assignment', 'liveSession']);

// Courses table - Updated per class diagram for "Registro de Curso"
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  modality: courseModalityEnum("modality").default('online'),
  language: varchar("language").default('es'),
  level: courseLevelEnum("level").default('introductorio'),
  durationHours: integer("duration_hours"),
  certifyingOrganizationId: varchar("certifying_organization_id"),
  status: courseStatusEnum("status").default('draft'),
  imageUrl: varchar("image_url"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course Modules table - "Registro de Clase" (Lección o módulo de curso)
export const courseModules = pgTable("course_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  title: varchar("title").notNull(),
  order: integer("order").notNull().default(1),
  contentType: moduleContentTypeEnum("content_type").default('video'),
  resourceUrl: varchar("resource_url"),
  isMandatory: boolean("is_mandatory").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course Certificates table - "Acreditación" (Emisión de constancias y certificados)
export const courseCertificates = pgTable("course_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  issueDate: timestamp("issue_date").defaultNow(),
  certificateNumber: varchar("certificate_number").notNull().unique(),
  issuerOrganizationId: varchar("issuer_organization_id"),
  digitalUrl: varchar("digital_url"),
});

// Course Evaluations table - "Evaluación" (Resultado de evaluaciones/cuestionarios)
export const courseEvaluations = pgTable("course_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(100),
  passed: boolean("passed").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Course enrollments table - "Registro de Participante" + "Progreso del Participante"
export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: enrollmentStatusEnum("status").default('enrolled'),
  completedModulesCount: integer("completed_modules_count").default(0),
  totalModulesCount: integer("total_modules_count").default(0),
  progressPercent: integer("progress_percent").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  certificateId: varchar("certificate_id"),
});

// Course relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [courses.createdByUserId],
    references: [users.id],
  }),
  modules: many(courseModules),
  enrollments: many(courseEnrollments),
}));

// Course modules relations
export const courseModulesRelations = relations(courseModules, ({ one }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
}));

// Course certificates relations
export const courseCertificatesRelations = relations(courseCertificates, ({ one }) => ({
  course: one(courses, {
    fields: [courseCertificates.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseCertificates.userId],
    references: [users.id],
  }),
}));

// Course evaluations relations
export const courseEvaluationsRelations = relations(courseEvaluations, ({ one }) => ({
  course: one(courses, {
    fields: [courseEvaluations.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseEvaluations.userId],
    references: [users.id],
  }),
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

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseEvaluationSchema = createInsertSchema(courseEvaluations).omit({
  id: true,
  submittedAt: true,
});

export const insertCourseCertificateSchema = createInsertSchema(courseCertificates).omit({
  id: true,
  issueDate: true,
});

// Course types
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;

export type CourseEvaluation = typeof courseEvaluations.$inferSelect;
export type InsertCourseEvaluation = z.infer<typeof insertCourseEvaluationSchema>;

export type CourseCertificate = typeof courseCertificates.$inferSelect;
export type InsertCourseCertificate = z.infer<typeof insertCourseCertificateSchema>;

export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;

// Extended types
export type CourseWithCreator = Course & {
  createdBy?: User;
};

export type EnrollmentWithCourse = CourseEnrollment & {
  course?: Course;
};

// Mentorship program status enum - draft, open, active, closed
export const mentorshipProgramStatusEnum = pgEnum('mentorship_program_status', ['draft', 'open', 'active', 'closed']);

// Mentorship Programs table - "Registro de programa de mentoría"
export const mentorshipPrograms = pgTable("mentorship_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  sessionsPlanned: integer("sessions_planned").default(4),
  focusArea: varchar("focus_area"),
  status: mentorshipProgramStatusEnum("status").default('draft'),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentorship enrollment status enum - requested, confirmed, in_progress, completed, cancelled
export const mentorshipEnrollmentStatusEnum = pgEnum('mentorship_enrollment_status', ['requested', 'confirmed', 'in_progress', 'completed', 'cancelled']);

// Mentorship session status enum - scheduled, done, cancelled, rescheduled
export const mentorshipSessionStatusEnum = pgEnum('mentorship_session_status', ['scheduled', 'done', 'cancelled', 'rescheduled']);

// Mentorship Enrollments table - "Registro de Mentores y Mentees"
export const mentorshipEnrollments = pgTable("mentorship_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => mentorshipPrograms.id),
  menteeUserId: varchar("mentee_user_id").notNull().references(() => users.id),
  mentorUserId: varchar("mentor_user_id").references(() => users.id),
  status: mentorshipEnrollmentStatusEnum("status").default('requested'),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legacy mentorships table (kept for backward compatibility)
export const mentorships = pgTable("mentorships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").references(() => mentorshipPrograms.id),
  menteeId: varchar("mentee_id").notNull().references(() => users.id),
  mentorId: varchar("mentor_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  status: varchar("status").default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentorship progress level enum
export const mentorshipProgressLevelEnum = pgEnum('mentorship_progress_level', ['idea_inicial', 'diagnostico', 'diseno_proyecto', 'prototipo', 'pitch_listo', 'implementacion']);

// Mentorship sessions table - "Registro de sesiones de mentoría"
export const mentorshipSessions = pgTable("mentorship_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").notNull().references(() => mentorshipEnrollments.id),
  sessionNumber: integer("session_number").notNull().default(1),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").default(60),
  status: mentorshipSessionStatusEnum("status").default('scheduled'),
  meetingLink: varchar("meeting_link"),
  attendanceRecorded: boolean("attendance_recorded").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship Reports table - "Informes de mentoría"
export const mentorshipReports = pgTable("mentorship_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => mentorshipSessions.id),
  summary: text("summary"),
  progressLevel: mentorshipProgressLevelEnum("progress_level"),
  actionItems: text("action_items"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship program relations
export const mentorshipProgramsRelations = relations(mentorshipPrograms, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [mentorshipPrograms.createdByUserId],
    references: [users.id],
  }),
  enrollments: many(mentorshipEnrollments),
  mentorships: many(mentorships),
}));

// Mentorship enrollment relations
export const mentorshipEnrollmentsRelations = relations(mentorshipEnrollments, ({ one, many }) => ({
  program: one(mentorshipPrograms, {
    fields: [mentorshipEnrollments.programId],
    references: [mentorshipPrograms.id],
  }),
  mentee: one(users, {
    fields: [mentorshipEnrollments.menteeUserId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [mentorshipEnrollments.mentorUserId],
    references: [users.id],
  }),
  sessions: many(mentorshipSessions),
}));

// Mentorship relations
export const mentorshipsRelations = relations(mentorships, ({ one, many }) => ({
  program: one(mentorshipPrograms, {
    fields: [mentorships.programId],
    references: [mentorshipPrograms.id],
  }),
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

export const mentorshipSessionsRelations = relations(mentorshipSessions, ({ one, many }) => ({
  enrollment: one(mentorshipEnrollments, {
    fields: [mentorshipSessions.enrollmentId],
    references: [mentorshipEnrollments.id],
  }),
  reports: many(mentorshipReports),
}));

// Mentorship reports relations
export const mentorshipReportsRelations = relations(mentorshipReports, ({ one }) => ({
  session: one(mentorshipSessions, {
    fields: [mentorshipReports.sessionId],
    references: [mentorshipSessions.id],
  }),
  createdBy: one(users, {
    fields: [mentorshipReports.createdByUserId],
    references: [users.id],
  }),
}));

// Insert schemas for mentorships
export const insertMentorshipProgramSchema = createInsertSchema(mentorshipPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorshipEnrollmentSchema = createInsertSchema(mentorshipEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorshipSchema = createInsertSchema(mentorships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorshipSessionSchema = createInsertSchema(mentorshipSessions).omit({
  id: true,
  createdAt: true,
});

export const insertMentorshipReportSchema = createInsertSchema(mentorshipReports).omit({
  id: true,
  createdAt: true,
});

// Mentorship types
export type MentorshipProgram = typeof mentorshipPrograms.$inferSelect;
export type InsertMentorshipProgram = z.infer<typeof insertMentorshipProgramSchema>;

export type MentorshipEnrollment = typeof mentorshipEnrollments.$inferSelect;
export type InsertMentorshipEnrollment = z.infer<typeof insertMentorshipEnrollmentSchema>;

export type Mentorship = typeof mentorships.$inferSelect;
export type InsertMentorship = z.infer<typeof insertMentorshipSchema>;

export type MentorshipSession = typeof mentorshipSessions.$inferSelect;
export type InsertMentorshipSession = z.infer<typeof insertMentorshipSessionSchema>;

export type MentorshipReport = typeof mentorshipReports.$inferSelect;
export type InsertMentorshipReport = z.infer<typeof insertMentorshipReportSchema>;

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
// CO-LAB - Collaborative acceleration programs
// ============================================

// CoLab type enum - big_idea, multi_idea, incubation_early_stage
export const colabTypeEnum = pgEnum('colab_type', ['big_idea', 'multi_idea', 'incubation_early_stage']);

// CoLab call status enum - draft, open, closed, archived
export const colabCallStatusEnum = pgEnum('colab_call_status', ['draft', 'open', 'closed', 'archived']);

// CoLabCall table - "Convocatoria para participar en un Co-Lab"
export const colabCalls = pgTable("colab_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  type: colabTypeEnum("type").notNull(),
  hostOrganizationId: varchar("host_organization_id").references(() => organizations.id),
  openFrom: timestamp("open_from"),
  openUntil: timestamp("open_until"),
  maxApplications: integer("max_applications"),
  status: colabCallStatusEnum("status").default('draft'),
  createdAt: timestamp("created_at").defaultNow(),
});

// CoLabCall relations
export const colabCallsRelations = relations(colabCalls, ({ one }) => ({
  hostOrganization: one(organizations, {
    fields: [colabCalls.hostOrganizationId],
    references: [organizations.id],
  }),
}));

// Insert schema for CoLabCall
export const insertColabCallSchema = createInsertSchema(colabCalls).omit({
  id: true,
  createdAt: true,
});

// CoLabCall types
export type ColabCall = typeof colabCalls.$inferSelect;
export type InsertColabCall = z.infer<typeof insertColabCallSchema>;

// CoLab application status enum
export const colabApplicationStatusEnum = pgEnum('colab_application_status', ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn']);

// CoLabApplication table - "Postulación de una idea/proyecto a la convocatoria"
export const colabApplications = pgTable("colab_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => colabCalls.id),
  projectId: varchar("project_id").references(() => projects.id),
  applicantUserId: varchar("applicant_user_id").notNull().references(() => users.id),
  ideaTitle: varchar("idea_title").notNull(),
  ideaSummary: text("idea_summary"),
  status: colabApplicationStatusEnum("status").default('submitted'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
  decidedByUserId: varchar("decided_by_user_id").references(() => users.id),
  scoreAverage: integer("score_average"),
});

// CoLabApplication relations
export const colabApplicationsRelations = relations(colabApplications, ({ one }) => ({
  call: one(colabCalls, {
    fields: [colabApplications.callId],
    references: [colabCalls.id],
  }),
  project: one(projects, {
    fields: [colabApplications.projectId],
    references: [projects.id],
  }),
  applicant: one(users, {
    fields: [colabApplications.applicantUserId],
    references: [users.id],
  }),
  decidedBy: one(users, {
    fields: [colabApplications.decidedByUserId],
    references: [users.id],
  }),
}));

// Insert schema for CoLabApplication
export const insertColabApplicationSchema = createInsertSchema(colabApplications).omit({
  id: true,
  submittedAt: true,
});

// CoLabApplication types
export type ColabApplication = typeof colabApplications.$inferSelect;
export type InsertColabApplication = z.infer<typeof insertColabApplicationSchema>;

// CoLabEvaluation table - "Evaluación de una aplicación por parte de un jurado"
export const colabEvaluations = pgTable("colab_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => colabApplications.id),
  judgeUserId: varchar("judge_user_id").notNull().references(() => users.id),
  score: integer("score"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CoLabEvaluation relations
export const colabEvaluationsRelations = relations(colabEvaluations, ({ one }) => ({
  application: one(colabApplications, {
    fields: [colabEvaluations.applicationId],
    references: [colabApplications.id],
  }),
  judge: one(users, {
    fields: [colabEvaluations.judgeUserId],
    references: [users.id],
  }),
}));

// Insert schema for CoLabEvaluation
export const insertColabEvaluationSchema = createInsertSchema(colabEvaluations).omit({
  id: true,
  createdAt: true,
});

// CoLabEvaluation types
export type ColabEvaluation = typeof colabEvaluations.$inferSelect;
export type InsertColabEvaluation = z.infer<typeof insertColabEvaluationSchema>;

// CoLab cohort status enum
export const colabCohortStatusEnum = pgEnum('colab_cohort_status', ['planned', 'active', 'completed']);

// CoLabCohort table - "Cohorte seleccionada para participar en el Co-Lab"
export const colabCohorts = pgTable("colab_cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => colabCalls.id),
  title: varchar("title").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: colabCohortStatusEnum("status").default('planned'),
  leadFacilitatorUserId: varchar("lead_facilitator_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// CoLabCohort relations
export const colabCohortsRelations = relations(colabCohorts, ({ one }) => ({
  call: one(colabCalls, {
    fields: [colabCohorts.callId],
    references: [colabCalls.id],
  }),
  leadFacilitator: one(users, {
    fields: [colabCohorts.leadFacilitatorUserId],
    references: [users.id],
  }),
}));

// Insert schema for CoLabCohort
export const insertColabCohortSchema = createInsertSchema(colabCohorts).omit({
  id: true,
  createdAt: true,
});

// CoLabCohort types
export type ColabCohort = typeof colabCohorts.$inferSelect;
export type InsertColabCohort = z.infer<typeof insertColabCohortSchema>;

// CoLab session type enum
export const colabSessionTypeEnum = pgEnum('colab_session_type', ['kickoff', 'workshop', 'clinic', 'demo_day']);

// CoLab session status enum
export const colabSessionStatusEnum = pgEnum('colab_session_status', ['scheduled', 'done', 'cancelled']);

// CoLabSession table - "Sesión del Co-Lab (kickoff, taller, clínica, demo day)"
export const colabSessions = pgTable("colab_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => colabCohorts.id),
  title: varchar("title").notNull(),
  sessionType: colabSessionTypeEnum("session_type").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  durationMinutes: integer("duration_minutes").default(60),
  facilitatorUserId: varchar("facilitator_user_id").references(() => users.id),
  status: colabSessionStatusEnum("status").default('scheduled'),
  createdAt: timestamp("created_at").defaultNow(),
});

// CoLabSession relations
export const colabSessionsRelations = relations(colabSessions, ({ one }) => ({
  cohort: one(colabCohorts, {
    fields: [colabSessions.cohortId],
    references: [colabCohorts.id],
  }),
  facilitator: one(users, {
    fields: [colabSessions.facilitatorUserId],
    references: [users.id],
  }),
}));

// Insert schema for CoLabSession
export const insertColabSessionSchema = createInsertSchema(colabSessions).omit({
  id: true,
  createdAt: true,
});

// CoLabSession types
export type ColabSession = typeof colabSessions.$inferSelect;
export type InsertColabSession = z.infer<typeof insertColabSessionSchema>;

// CoLab milestone status enum
export const colabMilestoneStatusEnum = pgEnum('colab_milestone_status', ['planned', 'in_progress', 'completed', 'delayed']);

// CoLabMilestone table - "Hitos de avance por proyecto dentro del Co-Lab"
export const colabMilestones = pgTable("colab_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => colabCohorts.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  title: varchar("title").notNull(),
  dueDate: timestamp("due_date"),
  status: colabMilestoneStatusEnum("status").default('planned'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CoLabMilestone relations
export const colabMilestonesRelations = relations(colabMilestones, ({ one }) => ({
  cohort: one(colabCohorts, {
    fields: [colabMilestones.cohortId],
    references: [colabCohorts.id],
  }),
  project: one(projects, {
    fields: [colabMilestones.projectId],
    references: [projects.id],
  }),
}));

// Insert schema for CoLabMilestone
export const insertColabMilestoneSchema = createInsertSchema(colabMilestones).omit({
  id: true,
  createdAt: true,
});

// CoLabMilestone types
export type ColabMilestone = typeof colabMilestones.$inferSelect;
export type InsertColabMilestone = z.infer<typeof insertColabMilestoneSchema>;

// ============================================
// CO-LAB SPECIALIZATION: UNA GRAN IDEA
// ============================================

// Confidentiality level enum
export const colabConfidentialityEnum = pgEnum('colab_confidentiality', ['public', 'internal', 'confidential', 'restricted']);

// CoLab program status enum
export const colabProgramStatusEnum = pgEnum('colab_program_status', ['draft', 'active', 'paused', 'completed', 'archived']);

// CoLabProgram_OneBigIdea table - Programa Co-Lab para una gran idea central
export const colabProgramOneBigIdea = pgTable("colab_program_one_big_idea", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => colabCohorts.id),
  focusIdeaId: varchar("focus_idea_id"),
  collaborationRules: text("collaboration_rules"),
  confidentialityLevel: colabConfidentialityEnum("confidentiality_level").default('internal'),
  expectedResults: text("expected_results"),
  successCriteria: text("success_criteria"),
  contributionPolicy: text("contribution_policy"),
  status: colabProgramStatusEnum("status").default('draft'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Idea maturity level enum
export const ideaMaturityEnum = pgEnum('idea_maturity', ['concept', 'validated_problem', 'solution_design', 'prototype', 'pilot', 'scaling']);

// CoLabFocusIdea table - Idea central del laboratorio
export const colabFocusIdeas = pgTable("colab_focus_ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigIdea.id),
  title: varchar("title").notNull(),
  summary: text("summary"),
  problemOpportunity: text("problem_opportunity"),
  targetBeneficiaries: text("target_beneficiaries"),
  proposedSolution: text("proposed_solution"),
  impactTags: text("impact_tags"),
  challengeId: varchar("challenge_id"),
  projectId: varchar("project_id").references(() => projects.id),
  maturityLevel: ideaMaturityEnum("maturity_level").default('concept'),
  keyAssumptions: text("key_assumptions"),
  identifiedRisks: text("identified_risks"),
  strategicQuestions: text("strategic_questions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team role status enum
export const teamRoleStatusEnum = pgEnum('team_role_status', ['active', 'inactive']);

// CoLabIdeaTeamRole table - Roles dentro del equipo
export const colabIdeaTeamRoles = pgTable("colab_idea_team_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigIdea.id),
  roleName: varchar("role_name").notNull(),
  description: text("description"),
  responsibilities: text("responsibilities"),
  dedicationLevel: varchar("dedication_level"),
  selectionCriteria: text("selection_criteria"),
  status: teamRoleStatusEnum("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contribution type enum
export const contributionTypeEnum = pgEnum('contribution_type', ['research', 'design', 'feedback', 'artifact', 'mentoring', 'technical', 'other']);

// Contribution validation status enum
export const contributionValidationEnum = pgEnum('contribution_validation', ['pending', 'approved', 'rejected', 'needs_revision']);

// CoLabIdeaContribution table - Contribuciones de participantes
export const colabIdeaContributions = pgTable("colab_idea_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigIdea.id),
  contributorUserId: varchar("contributor_user_id").notNull().references(() => users.id),
  roleId: varchar("role_id").references(() => colabIdeaTeamRoles.id),
  contributionType: contributionTypeEnum("contribution_type"),
  briefDescription: varchar("brief_description"),
  detailedContribution: text("detailed_contribution"),
  artifactUrl: varchar("artifact_url"),
  sessionId: varchar("session_id").references(() => colabSessions.id),
  milestoneId: varchar("milestone_id").references(() => colabMilestones.id),
  timeSpentMinutes: integer("time_spent_minutes"),
  validationStatus: contributionValidationEnum("validation_status").default('pending'),
  reviewerUserId: varchar("reviewer_user_id").references(() => users.id),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Decision type enum
export const decisionTypeEnum = pgEnum('decision_type', ['scope', 'pivot', 'priority', 'alliance', 'resource', 'timeline', 'other']);

// CoLabIdeaDecisionLog table - Registro de decisiones
export const colabIdeaDecisionLogs = pgTable("colab_idea_decision_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigIdea.id),
  focusIdeaId: varchar("focus_idea_id").references(() => colabFocusIdeas.id),
  decisionType: decisionTypeEnum("decision_type"),
  description: text("description"),
  justification: text("justification"),
  decidedByUserId: varchar("decided_by_user_id").references(() => users.id),
  decidedAt: timestamp("decided_at").defaultNow(),
  artifactUrl: varchar("artifact_url"),
  notes: text("notes"),
});

// Review moment enum
export const reviewMomentEnum = pgEnum('review_moment', ['initial', 'intermediate', 'final', 'other']);

// CoLabIdeaReview table - Revisiones de la idea
export const colabIdeaReviews = pgTable("colab_idea_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigIdea.id),
  focusIdeaId: varchar("focus_idea_id").references(() => colabFocusIdeas.id),
  reviewMoment: reviewMomentEnum("review_moment"),
  rubricReference: varchar("rubric_reference"),
  overallEvaluation: text("overall_evaluation"),
  strengths: text("strengths"),
  areasToImprove: text("areas_to_improve"),
  recommendations: text("recommendations"),
  reviewerUserId: varchar("reviewer_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
  artifactsConsidered: text("artifacts_considered"),
});

// ============================================
// CO-LAB SPECIALIZATION: UN GRAN MÉTODO
// ============================================

// CoLabProgram_OneBigMethod table - Programa Co-Lab metodológico
export const colabProgramOneBigMethod = pgTable("colab_program_one_big_method", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => colabCohorts.id),
  methodName: varchar("method_name").notNull(),
  methodDescription: text("method_description"),
  methodObjective: text("method_objective"),
  eligibleIdeaTypes: text("eligible_idea_types"),
  maxParallelIdeas: integer("max_parallel_ideas"),
  maxParticipantsPerCohort: integer("max_participants_per_cohort"),
  expectedResults: text("expected_results"),
  successCriteria: text("success_criteria"),
  evaluationModel: text("evaluation_model"),
  usagePolicy: text("usage_policy"),
  status: colabProgramStatusEnum("status").default('draft'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CoLabMethodFramework table - Marco metodológico
export const colabMethodFrameworks = pgTable("colab_method_frameworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigMethod.id),
  frameworkName: varchar("framework_name").notNull(),
  description: text("description"),
  stagesList: text("stages_list"),
  stagesDescription: text("stages_description"),
  toolsPerStage: text("tools_per_stage"),
  artifactsPerStage: text("artifacts_per_stage"),
  evaluationCriteriaPerStage: text("evaluation_criteria_per_stage"),
  version: varchar("version").default('1.0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Idea track status enum
export const ideaTrackStatusEnum = pgEnum('idea_track_status', ['enrolled', 'in_progress', 'completed', 'withdrawn', 'graduated']);

// CoLabIdeaTrack table - Track de ideas dentro del método
export const colabIdeaTracks = pgTable("colab_idea_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigMethod.id),
  cohortId: varchar("cohort_id").references(() => colabCohorts.id),
  ideaTitle: varchar("idea_title").notNull(),
  ideaSummary: text("idea_summary"),
  ownerUserId: varchar("owner_user_id").references(() => users.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  status: ideaTrackStatusEnum("status").default('enrolled'),
  startedAt: timestamp("started_at"),
  closedAt: timestamp("closed_at"),
  projectId: varchar("project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stage progress status enum
export const stageProgressStatusEnum = pgEnum('stage_progress_status', ['not_started', 'in_progress', 'completed']);

// CoLabTrackStageProgress table - Progreso por etapa
export const colabTrackStageProgress = pgTable("colab_track_stage_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaTrackId: varchar("idea_track_id").notNull().references(() => colabIdeaTracks.id),
  stageName: varchar("stage_name").notNull(),
  status: stageProgressStatusEnum("status").default('not_started'),
  evaluationResult: text("evaluation_result"),
  facilitatorNotes: text("facilitator_notes"),
  blockers: text("blockers"),
  evidenceArtifacts: text("evidence_artifacts"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Method decision type enum
export const methodDecisionTypeEnum = pgEnum('method_decision_type', ['method_adjustment', 'exception', 'pivot', 'acceleration', 'pause', 'other']);

// CoLabMethodDecisionLog table - Registro de decisiones metodológicas
export const colabMethodDecisionLogs = pgTable("colab_method_decision_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigMethod.id),
  affectedStage: varchar("affected_stage"),
  decisionType: methodDecisionTypeEnum("decision_type"),
  description: text("description"),
  justification: text("justification"),
  decidedByUserId: varchar("decided_by_user_id").references(() => users.id),
  decidedAt: timestamp("decided_at").defaultNow(),
  notes: text("notes"),
});

// CoLabMethodReview table - Revisión del método
export const colabMethodReviews = pgTable("colab_method_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => colabProgramOneBigMethod.id),
  cohortId: varchar("cohort_id").references(() => colabCohorts.id),
  frameworkId: varchar("framework_id").references(() => colabMethodFrameworks.id),
  overallEvaluation: text("overall_evaluation"),
  patternsObserved: text("patterns_observed"),
  methodStrengths: text("method_strengths"),
  methodLimitations: text("method_limitations"),
  improvementRecommendations: text("improvement_recommendations"),
  reviewerUserId: varchar("reviewer_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
});

// Insert schemas for CO-LAB Gran Idea
export const insertColabProgramOneBigIdeaSchema = createInsertSchema(colabProgramOneBigIdea).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabFocusIdeaSchema = createInsertSchema(colabFocusIdeas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabIdeaTeamRoleSchema = createInsertSchema(colabIdeaTeamRoles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabIdeaContributionSchema = createInsertSchema(colabIdeaContributions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabIdeaDecisionLogSchema = createInsertSchema(colabIdeaDecisionLogs).omit({ id: true });
export const insertColabIdeaReviewSchema = createInsertSchema(colabIdeaReviews).omit({ id: true });

// Insert schemas for CO-LAB Gran Método
export const insertColabProgramOneBigMethodSchema = createInsertSchema(colabProgramOneBigMethod).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabMethodFrameworkSchema = createInsertSchema(colabMethodFrameworks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabIdeaTrackSchema = createInsertSchema(colabIdeaTracks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertColabTrackStageProgressSchema = createInsertSchema(colabTrackStageProgress).omit({ id: true });
export const insertColabMethodDecisionLogSchema = createInsertSchema(colabMethodDecisionLogs).omit({ id: true });
export const insertColabMethodReviewSchema = createInsertSchema(colabMethodReviews).omit({ id: true });

// Types for CO-LAB Gran Idea
export type ColabProgramOneBigIdea = typeof colabProgramOneBigIdea.$inferSelect;
export type InsertColabProgramOneBigIdea = z.infer<typeof insertColabProgramOneBigIdeaSchema>;
export type ColabFocusIdea = typeof colabFocusIdeas.$inferSelect;
export type InsertColabFocusIdea = z.infer<typeof insertColabFocusIdeaSchema>;
export type ColabIdeaTeamRole = typeof colabIdeaTeamRoles.$inferSelect;
export type InsertColabIdeaTeamRole = z.infer<typeof insertColabIdeaTeamRoleSchema>;
export type ColabIdeaContribution = typeof colabIdeaContributions.$inferSelect;
export type InsertColabIdeaContribution = z.infer<typeof insertColabIdeaContributionSchema>;
export type ColabIdeaDecisionLog = typeof colabIdeaDecisionLogs.$inferSelect;
export type InsertColabIdeaDecisionLog = z.infer<typeof insertColabIdeaDecisionLogSchema>;
export type ColabIdeaReview = typeof colabIdeaReviews.$inferSelect;
export type InsertColabIdeaReview = z.infer<typeof insertColabIdeaReviewSchema>;

// Types for CO-LAB Gran Método
export type ColabProgramOneBigMethod = typeof colabProgramOneBigMethod.$inferSelect;
export type InsertColabProgramOneBigMethod = z.infer<typeof insertColabProgramOneBigMethodSchema>;
export type ColabMethodFramework = typeof colabMethodFrameworks.$inferSelect;
export type InsertColabMethodFramework = z.infer<typeof insertColabMethodFrameworkSchema>;
export type ColabIdeaTrack = typeof colabIdeaTracks.$inferSelect;
export type InsertColabIdeaTrack = z.infer<typeof insertColabIdeaTrackSchema>;
export type ColabTrackStageProgress = typeof colabTrackStageProgress.$inferSelect;
export type InsertColabTrackStageProgress = z.infer<typeof insertColabTrackStageProgressSchema>;
export type ColabMethodDecisionLog = typeof colabMethodDecisionLogs.$inferSelect;
export type InsertColabMethodDecisionLog = z.infer<typeof insertColabMethodDecisionLogSchema>;
export type ColabMethodReview = typeof colabMethodReviews.$inferSelect;
export type InsertColabMethodReview = z.infer<typeof insertColabMethodReviewSchema>;

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

// ============================================
// CHALLENGES - Urban/institutional challenges
// ============================================

// Challenge status enum
export const challengeStatusEnum = pgEnum('challenge_status', [
  'draft',
  'open',
  'in_progress',
  'completed',
  'archived'
]);

// Challenges table - DP CH from diagram
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  contextOrganizationId: varchar("context_organization_id").references(() => organizations.id),
  city: varchar("city"),
  country: varchar("country"),
  sdgTags: text("sdg_tags").array(),
  status: challengeStatusEnum("status").default('draft'),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  openFrom: date("open_from"),
  openUntil: date("open_until"),
  maxProjects: integer("max_projects"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Challenge relations
export const challengesRelations = relations(challenges, ({ one, many }) => ({
  contextOrganization: one(organizations, {
    fields: [challenges.contextOrganizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [challenges.createdByUserId],
    references: [users.id],
  }),
  challengeProjects: many(challengeProjects),
}));

// Insert schema for challenges
export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Challenge types
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

export type ChallengeWithDetails = Challenge & {
  contextOrganization?: Organization | null;
  createdBy?: User | null;
};

// ============================================
// CHALLENGE PROJECTS - Projects linked to challenges
// ============================================

// Challenge project status enum
export const challengeProjectStatusEnum = pgEnum('challenge_project_status', [
  'idea',
  'design',
  'pilot',
  'active',
  'completed',
  'on_hold',
  'cancelled'
]);

// Challenge Projects table - DP PROJECT from diagram
export const challengeProjects = pgTable("challenge_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").references(() => challenges.id),
  title: varchar("title").notNull(),
  summary: text("summary"),
  status: challengeProjectStatusEnum("status").default('idea'),
  leadOrganizationId: varchar("lead_organization_id").references(() => organizations.id),
  locationCity: varchar("location_city"),
  locationCountry: varchar("location_country"),
  sdgTags: text("sdg_tags").array(),
  impactFocus: varchar("impact_focus"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isPilot: boolean("is_pilot").default(true),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Challenge Projects relations
export const challengeProjectsRelations = relations(challengeProjects, ({ one, many }) => ({
  challenge: one(challenges, {
    fields: [challengeProjects.challengeId],
    references: [challenges.id],
  }),
  leadOrganization: one(organizations, {
    fields: [challengeProjects.leadOrganizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [challengeProjects.createdByUserId],
    references: [users.id],
  }),
  participants: many(projectParticipants),
}));

// Insert schema for challenge projects
export const insertChallengeProjectSchema = createInsertSchema(challengeProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Challenge Project types
export type ChallengeProject = typeof challengeProjects.$inferSelect;
export type InsertChallengeProject = z.infer<typeof insertChallengeProjectSchema>;

export type ChallengeProjectWithDetails = ChallengeProject & {
  challenge?: Challenge | null;
  leadOrganization?: Organization | null;
  createdBy?: User | null;
  participants?: ProjectParticipantWithUser[];
};

// ============================================
// PROJECT PARTICIPANTS - Team members in projects
// ============================================

// Project participant role enum
export const projectParticipantRoleEnum = pgEnum('project_participant_role', [
  'project_lead',
  'volunteer_consultant',
  'mentor',
  'evaluator',
  'team_member',
  'advisor',
  'other'
]);

// Project Participants table - DP PROJECT PARTICIPANT from diagram
export const projectParticipants = pgTable("project_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => challengeProjects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: projectParticipantRoleEnum("role").default('team_member'),
  assignedHours: integer("assigned_hours"),
  isLead: boolean("is_lead").default(false),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Participants relations
export const projectParticipantsRelations = relations(projectParticipants, ({ one }) => ({
  project: one(challengeProjects, {
    fields: [projectParticipants.projectId],
    references: [challengeProjects.id],
  }),
  user: one(users, {
    fields: [projectParticipants.userId],
    references: [users.id],
  }),
}));

// Insert schema for project participants
export const insertProjectParticipantSchema = createInsertSchema(projectParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project Participant types
export type ProjectParticipant = typeof projectParticipants.$inferSelect;
export type InsertProjectParticipant = z.infer<typeof insertProjectParticipantSchema>;

export type ProjectParticipantWithUser = ProjectParticipant & {
  user?: User;
};

export type ProjectParticipantWithDetails = ProjectParticipant & {
  user?: User;
  project?: ChallengeProject;
};

// ============================================
// MATCH RECORDS - Intelligent matching system
// ============================================

// Match type enum
export const matchTypeEnum = pgEnum('match_type', [
  'challenge_project',
  'project_talent',
  'organization_talent',
  'organization_project'
]);

// Match status enum
export const matchStatusEnum = pgEnum('match_status', [
  'suggested',
  'pending_approval',
  'accepted',
  'rejected',
  'cancelled'
]);

// Match Records table - DP MATCH RECORD from diagram
export const matchRecords = pgTable("match_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").references(() => challenges.id),
  projectId: varchar("project_id").references(() => challengeProjects.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  professionalUserId: varchar("professional_user_id").references(() => users.id),
  matchType: matchTypeEnum("match_type").notNull(),
  status: matchStatusEnum("status").default('suggested'),
  score: integer("score"),
  scoreDetails: jsonb("score_details"),
  createdAt: timestamp("created_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
  decidedByUserId: varchar("decided_by_user_id").references(() => users.id),
  notes: text("notes"),
});

// Match Records relations
export const matchRecordsRelations = relations(matchRecords, ({ one }) => ({
  challenge: one(challenges, {
    fields: [matchRecords.challengeId],
    references: [challenges.id],
  }),
  project: one(challengeProjects, {
    fields: [matchRecords.projectId],
    references: [challengeProjects.id],
  }),
  organization: one(organizations, {
    fields: [matchRecords.organizationId],
    references: [organizations.id],
  }),
  professionalUser: one(users, {
    fields: [matchRecords.professionalUserId],
    references: [users.id],
    relationName: 'matchProfessional',
  }),
  decidedBy: one(users, {
    fields: [matchRecords.decidedByUserId],
    references: [users.id],
    relationName: 'matchDecider',
  }),
}));

// Insert schema for match records
export const insertMatchRecordSchema = createInsertSchema(matchRecords).omit({
  id: true,
  createdAt: true,
});

// Match Record types
export type MatchRecord = typeof matchRecords.$inferSelect;
export type InsertMatchRecord = z.infer<typeof insertMatchRecordSchema>;

export type MatchRecordWithDetails = MatchRecord & {
  challenge?: Challenge | null;
  project?: ChallengeProject | null;
  organization?: Organization | null;
  professionalUser?: User | null;
  decidedBy?: User | null;
};

// ============================================
// EVENTS - Platform events and registrations
// ============================================

// Event status enum
export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'cancelled',
  'completed'
]);

// Event type enum for acceleration events
export const eventTypeEnum = pgEnum('event_type', [
  'general',
  'acceleration',
  'workshop',
  'mentorship_session',
  'demo_day',
  'pitch_practice',
  'networking'
]);

// Acceleration programs table
export const accelerationPrograms = pgTable("acceleration_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxParticipants: integer("max_participants"),
  status: varchar("status").default('draft'),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  location: varchar("location"),
  isOnline: varchar("is_online").default('false'),
  meetingUrl: varchar("meeting_url"),
  maxAttendees: integer("max_attendees"),
  category: varchar("category"),
  eventType: eventTypeEnum("event_type").default('general'),
  accelerationProgramId: varchar("acceleration_program_id").references(() => accelerationPrograms.id),
  phase: varchar("phase"),
  isMandatory: varchar("is_mandatory").default('false'),
  status: eventStatusEnum("status").default('draft'),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event registration status enum
export const eventRegistrationStatusEnum = pgEnum('event_registration_status', [
  'registered',
  'attended',
  'cancelled',
  'no_show'
]);

// Event registrations table
export const eventRegistrations = pgTable("event_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: eventRegistrationStatusEnum("status").default('registered'),
  registeredAt: timestamp("registered_at").defaultNow(),
  attendedAt: timestamp("attended_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// Acceleration programs relations
export const accelerationProgramsRelations = relations(accelerationPrograms, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [accelerationPrograms.createdByUserId],
    references: [users.id],
  }),
  events: many(events),
}));

// Events relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [events.createdByUserId],
    references: [users.id],
  }),
  registrations: many(eventRegistrations),
  accelerationProgram: one(accelerationPrograms, {
    fields: [events.accelerationProgramId],
    references: [accelerationPrograms.id],
  }),
}));

// Event registrations relations
export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

// Insert schemas for acceleration programs
export const insertAccelerationProgramSchema = createInsertSchema(accelerationPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for events
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  registeredAt: true,
});

// Acceleration program types
export type AccelerationProgram = typeof accelerationPrograms.$inferSelect;
export type InsertAccelerationProgram = z.infer<typeof insertAccelerationProgramSchema>;

export type AccelerationProgramWithDetails = AccelerationProgram & {
  createdBy?: User | null;
  events?: Event[];
  eventCount?: number;
};

// Event types
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;

export type EventWithDetails = Event & {
  createdBy?: User | null;
  registrations?: EventRegistration[];
  registrationCount?: number;
  accelerationProgram?: AccelerationProgram | null;
};
