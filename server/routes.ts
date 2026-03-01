import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isImpactLabAdmin } from "./replitAuth";
import { 
  insertActivityLogSchema,
  insertProjectSchema, 
  insertCourseSchema, 
  insertMentorshipSchema, 
  insertMentorshipSessionSchema, 
  insertOrganizationSchema, 
  insertOrganizationMembershipSchema,
  insertChallengeSchema,
  insertChallengeProjectSchema,
  insertProjectParticipantSchema,
  insertMatchRecordSchema
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed roles on startup
  await storage.seedRoles();

  // Seed test data endpoint (facilitadors only)
  app.post('/api/seed-test-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      if (!isFacilitador) {
        return res.status(403).json({ message: "Only facilitators can seed test data" });
      }
      
      const result = await storage.seedTestData(userId);
      res.json({ 
        message: "Test data seeded successfully", 
        created: result 
      });
    } catch (error) {
      console.error("Error seeding test data:", error);
      res.status(500).json({ message: "Failed to seed test data" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserWithProfile(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/admin/login', async (req: any, res) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      const user = await storage.validateLocalUser(username, password);
      if (!user || user.username !== 'impactlab') {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.localUserId = user.id;
      const userWithProfile = await storage.getUserWithProfile(user.id);
      res.json(userWithProfile);
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/activity', async (req: any, res) => {
    try {
      const userId = await resolveTrackedUserId(req);
      const path = sanitizeTrackedPath(req.body?.path);
      if (!path) {
        return res.status(400).json({ message: "Path is required" });
      }

      const location = getLocationFromHeaders(req);
      const validationResult = insertActivityLogSchema.safeParse({
        userId,
        activityType: req.body?.activityType,
        path,
        buttonId: sanitizeOptionalText(req.body?.buttonId),
        buttonLabel: sanitizeOptionalText(req.body?.buttonLabel),
        ipAddress: getClientIp(req),
        country: location.country,
        region: location.region,
        city: location.city,
        userAgent: sanitizeOptionalText(req.get("user-agent")),
        metadata: sanitizeMetadata(req.body?.metadata),
      });

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid activity payload",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      await storage.createActivityLog(validationResult.data);
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Error creating activity log:", error);
      res.status(500).json({ message: "Failed to record activity" });
    }
  });

  app.get('/api/admin/activity', isImpactLabAdmin, async (req, res) => {
    try {
      const range = normalizeActivityRange(req.query.range);
      const report = await storage.getActivityReport(range);
      res.json(report);
    } catch (error) {
      console.error("Error fetching activity report:", error);
      res.status(500).json({ message: "Failed to fetch activity report" });
    }
  });

  // Profile routes
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, timezone, ...profileData } = req.body;

      // Update user basic info
      if (firstName || lastName || timezone) {
        const user = await storage.getUser(userId);
        if (user) {
          await storage.upsertUser({
            ...user,
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            timezone: timezone || user.timezone,
          });
        }
      }

      // Update profile
      const profile = await storage.upsertProfile(userId, {
        ...profileData,
        profileStatus: isProfileComplete(profileData) ? 'complete' : 'incomplete',
      });

      const updatedUser = await storage.getUserWithProfile(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get all roles
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Update user's own roles
  app.put('/api/auth/user/roles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { roleIds } = req.body;
      
      if (!Array.isArray(roleIds) || roleIds.length === 0) {
        return res.status(400).json({ message: "At least one role must be selected" });
      }
      
      // Get all roles to validate the request
      const allRoles = await storage.getRoles();
      const roleMap = new Map(allRoles.map(r => [r.id, r]));
      
      // Define self-assignable roles (non-privileged roles)
      const selfAssignableRoles = ['usuario', 'proponente'];
      
      // Check if user is a facilitador (can assign any role)
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      // Validate requested roles
      for (const roleId of roleIds) {
        const role = roleMap.get(roleId);
        if (!role) {
          return res.status(400).json({ message: `Invalid role ID: ${roleId}` });
        }
        
        // If user is not facilitador, they can only assign self-assignable roles
        if (!isFacilitador && !selfAssignableRoles.includes(role.name)) {
          return res.status(403).json({ 
            message: `Cannot self-assign privileged role: ${role.name}. Contact a facilitator.` 
          });
        }
      }
      
      const updatedRoles = await storage.setUserRoles(userId, roleIds);
      res.json(updatedRoles);
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).json({ message: "Failed to update roles" });
    }
  });

  // ===== PROJECT ROUTES =====
  
  // Get all projects (for facilitators/mentors) or user's own projects
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole === 'facilitador' || userRole === 'mentor') {
        const allProjects = await storage.getProjects();
        res.json(allProjects);
      } else {
        const userProjects = await storage.getProjectsByOwner(userId);
        res.json(userProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get my projects (always returns only user's projects)
  app.get('/api/projects/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsByOwner(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching my projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get single project (with authorization check)
  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user can access this project
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only owner, mentor, or facilitator can view project details
      if (project.ownerId !== userId && project.mentorId !== userId && userRole !== 'facilitador' && userRole !== 'mentor') {
        return res.status(403).json({ message: "Not authorized to view this project" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create project
  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check user role for mentor assignment
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Build project data with allowed fields only
      const projectData: Record<string, any> = {
        title: req.body.title,
        description: req.body.description,
        objectives: req.body.objectives,
        targetBeneficiaries: req.body.targetBeneficiaries,
        expectedImpact: req.body.expectedImpact,
        location: req.body.location,
        category: req.body.category,
        status: req.body.status || 'draft',
        ownerId: userId,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      };
      
      // Only facilitadores can assign a mentor during creation
      if (userRole === 'facilitador' && req.body.mentorId) {
        projectData.mentorId = req.body.mentorId;
      }
      
      // Validate project data
      const validationResult = insertProjectSchema.safeParse(projectData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const project = await storage.createProject(validationResult.data);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update project
  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check ownership or admin/mentor role
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (project.ownerId !== userId && userRole !== 'facilitador' && userRole !== 'mentor') {
        return res.status(403).json({ message: "Not authorized to update this project" });
      }
      
      // Whitelist allowed fields to prevent ownerId reassignment
      const allowedFields = ['title', 'description', 'objectives', 'targetBeneficiaries', 'expectedImpact', 'location', 'category', 'status', 'startDate', 'endDate'];
      
      // Only facilitadores can assign/change mentor
      if (userRole === 'facilitador' && req.body.mentorId !== undefined) {
        allowedFields.push('mentorId');
      }
      
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateProject(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete project
  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Only owner or facilitator can delete
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (project.ownerId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to delete this project" });
      }
      
      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // ===== COURSE ROUTES =====
  
  // Get all courses (facilitadores see all, others see only published)
  app.get('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      const includeUnpublished = userRole === 'facilitador';
      const courses = await storage.getCourses(includeUnpublished);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get single course
  app.get('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Create course (facilitador only)
  app.post('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can create courses" });
      }
      
      const courseData = {
        ...req.body,
        instructorId: userId,
      };
      
      const validationResult = insertCourseSchema.safeParse(courseData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid course data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const course = await storage.createCourse(validationResult.data);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course (facilitador only)
  app.patch('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can update courses" });
      }
      
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const allowedFields = ['title', 'description', 'content', 'category', 'difficulty', 'duration', 'status', 'imageUrl'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateCourse(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course (facilitador only)
  app.delete('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can delete courses" });
      }
      
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      await storage.deleteCourse(req.params.id);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // ===== ENROLLMENT ROUTES =====
  
  // Get user's enrollments
  app.get('/api/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getEnrollmentsByUser(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Enroll in a course
  app.post('/api/courses/:id/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseId = req.params.id;
      
      // Check if course exists and is published
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.status !== 'published') {
        return res.status(400).json({ message: "Cannot enroll in unpublished course" });
      }
      
      // Check if already enrolled
      const existing = await storage.getEnrollment(courseId, userId);
      if (existing) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }
      
      const enrollment = await storage.enrollUser(courseId, userId);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error enrolling in course:", error);
      res.status(500).json({ message: "Failed to enroll in course" });
    }
  });

  // Update enrollment progress
  app.patch('/api/enrollments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollmentId = req.params.id;
      
      // Get enrollments to verify ownership
      const userEnrollments = await storage.getEnrollmentsByUser(userId);
      const enrollment = userEnrollments.find(e => e.id === enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const allowedFields = ['status', 'progress', 'completedAt'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateEnrollment(enrollmentId, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating enrollment:", error);
      res.status(500).json({ message: "Failed to update enrollment" });
    }
  });

  // Unenroll from course
  app.delete('/api/courses/:id/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseId = req.params.id;
      
      const existing = await storage.getEnrollment(courseId, userId);
      if (!existing) {
        return res.status(404).json({ message: "Not enrolled in this course" });
      }
      
      await storage.unenrollUser(courseId, userId);
      res.json({ message: "Successfully unenrolled from course" });
    } catch (error) {
      console.error("Error unenrolling from course:", error);
      res.status(500).json({ message: "Failed to unenroll from course" });
    }
  });

  // ===== MENTORSHIP ROUTES =====
  
  // Get mentors list (for requesting mentorship)
  app.get('/api/mentors', isAuthenticated, async (req: any, res) => {
    try {
      const mentors = await storage.getMentors();
      res.json(mentors);
    } catch (error) {
      console.error("Error fetching mentors:", error);
      res.status(500).json({ message: "Failed to fetch mentors" });
    }
  });

  // Get mentorships (filtered by role)
  app.get('/api/mentorships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      let mentorshipList;
      if (userRole === 'facilitador') {
        mentorshipList = await storage.getMentorships();
      } else if (userRole === 'mentor') {
        mentorshipList = await storage.getMentorshipsByMentor(userId);
      } else {
        mentorshipList = await storage.getMentorshipsByMentee(userId);
      }
      
      res.json(mentorshipList);
    } catch (error) {
      console.error("Error fetching mentorships:", error);
      res.status(500).json({ message: "Failed to fetch mentorships" });
    }
  });

  // Get single mentorship
  app.get('/api/mentorships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mentorship = await storage.getMentorship(req.params.id);
      
      if (!mentorship) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      
      // Check authorization
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (mentorship.menteeId !== userId && mentorship.mentorId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to view this mentorship" });
      }
      
      res.json(mentorship);
    } catch (error) {
      console.error("Error fetching mentorship:", error);
      res.status(500).json({ message: "Failed to fetch mentorship" });
    }
  });

  // Request mentorship (usuarios can create)
  app.post('/api/mentorships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const mentorshipData = {
        menteeId: userId,
        mentorId: req.body.mentorId || null,
        projectId: req.body.projectId || null,
        notes: req.body.notes,
        status: 'pending' as const,
      };
      
      const validationResult = insertMentorshipSchema.safeParse(mentorshipData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid mentorship data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const mentorship = await storage.createMentorship(validationResult.data);
      res.status(201).json(mentorship);
    } catch (error) {
      console.error("Error creating mentorship:", error);
      res.status(500).json({ message: "Failed to create mentorship" });
    }
  });

  // Update mentorship (mentor/facilitador can update status, assign mentor)
  app.patch('/api/mentorships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mentorship = await storage.getMentorship(req.params.id);
      
      if (!mentorship) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Check authorization - facilitador can do anything, mentor can update their own
      if (userRole !== 'facilitador' && mentorship.mentorId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this mentorship" });
      }
      
      const allowedFields = ['status', 'notes'];
      if (userRole === 'facilitador') {
        allowedFields.push('mentorId');
      }
      
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateMentorship(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating mentorship:", error);
      res.status(500).json({ message: "Failed to update mentorship" });
    }
  });

  // Delete mentorship (facilitador only)
  app.delete('/api/mentorships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can delete mentorships" });
      }
      
      const mentorship = await storage.getMentorship(req.params.id);
      if (!mentorship) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      
      await storage.deleteMentorship(req.params.id);
      res.json({ message: "Mentorship deleted successfully" });
    } catch (error) {
      console.error("Error deleting mentorship:", error);
      res.status(500).json({ message: "Failed to delete mentorship" });
    }
  });

  // ===== MENTORSHIP SESSION ROUTES =====
  
  // Get sessions for a mentorship
  app.get('/api/mentorships/:id/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mentorship = await storage.getMentorship(req.params.id);
      
      if (!mentorship) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      
      // Check authorization
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (mentorship.menteeId !== userId && mentorship.mentorId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to view these sessions" });
      }
      
      const sessions = await storage.getMentorshipSessions(req.params.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Create session (mentor only)
  app.post('/api/mentorships/:id/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mentorship = await storage.getMentorship(req.params.id);
      
      if (!mentorship) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only mentor or facilitador can create sessions
      if (mentorship.mentorId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only the assigned mentor can create sessions" });
      }
      
      const sessionData = {
        mentorshipId: req.params.id,
        scheduledAt: new Date(req.body.scheduledAt),
        duration: req.body.duration,
        notes: req.body.notes,
        status: 'scheduled' as const,
      };
      
      const validationResult = insertMentorshipSessionSchema.safeParse(sessionData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid session data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const session = await storage.createMentorshipSession(validationResult.data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Update session
  app.patch('/api/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only mentor or facilitador
      if (userRole !== 'mentor' && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to update sessions" });
      }
      
      const allowedFields = ['scheduledAt', 'duration', 'notes', 'status'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === 'scheduledAt') {
            sanitizedData[field] = new Date(req.body[field]);
          } else {
            sanitizedData[field] = req.body[field];
          }
        }
      }
      
      const updated = await storage.updateMentorshipSession(req.params.id, sanitizedData);
      if (!updated) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Delete session
  app.delete('/api/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'mentor' && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to delete sessions" });
      }
      
      await storage.deleteMentorshipSession(req.params.id);
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // ===== ORGANIZATION ROUTES =====
  
  // Get all organizations (facilitador sees all, others see active only)
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      const activeOnly = userRole !== 'facilitador';
      const organizations = await storage.getOrganizations(activeOnly);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Get single organization with memberships
  app.get('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const organization = await storage.getOrganization(req.params.id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Create organization (facilitador only)
  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can create organizations" });
      }
      
      const validationResult = insertOrganizationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid organization data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const organization = await storage.createOrganization(validationResult.data);
      res.status(201).json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Update organization (facilitador only)
  app.patch('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can update organizations" });
      }
      
      const organization = await storage.getOrganization(req.params.id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const allowedFields = ['name', 'legalStatus', 'description', 'country', 'city', 'website', 'logoUrl'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateOrganization(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Activate organization (facilitador only)
  app.post('/api/organizations/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can activate organizations" });
      }
      
      const organization = await storage.activateOrganization(req.params.id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error activating organization:", error);
      res.status(500).json({ message: "Failed to activate organization" });
    }
  });

  // Deactivate organization (facilitador only)
  app.post('/api/organizations/:id/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can deactivate organizations" });
      }
      
      const organization = await storage.deactivateOrganization(req.params.id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error deactivating organization:", error);
      res.status(500).json({ message: "Failed to deactivate organization" });
    }
  });

  // ===== ORGANIZATION MEMBERSHIP ROUTES =====
  
  // Get all users (for membership assignment)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can view all users" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get memberships for an organization
  app.get('/api/organizations/:id/memberships', isAuthenticated, async (req: any, res) => {
    try {
      const memberships = await storage.getOrganizationMemberships(req.params.id);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching organization memberships:", error);
      res.status(500).json({ message: "Failed to fetch memberships" });
    }
  });

  // Get user's organization memberships
  app.get('/api/my-memberships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await storage.getMembershipsByUser(userId);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching user memberships:", error);
      res.status(500).json({ message: "Failed to fetch memberships" });
    }
  });

  // Create organization membership (facilitador only)
  app.post('/api/organizations/:id/memberships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can add members" });
      }
      
      const membershipData = {
        ...req.body,
        organizationId: req.params.id,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      };
      
      const validationResult = insertOrganizationMembershipSchema.safeParse(membershipData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid membership data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const membership = await storage.createOrganizationMembership(validationResult.data);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error creating membership:", error);
      res.status(500).json({ message: "Failed to create membership" });
    }
  });

  // Update organization membership (facilitador only)
  app.patch('/api/memberships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can update memberships" });
      }
      
      const membership = await storage.getOrganizationMembership(req.params.id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      
      const allowedFields = ['role', 'startDate', 'endDate', 'isCurrent', 'notes'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === 'startDate' || field === 'endDate') {
            sanitizedData[field] = req.body[field] ? new Date(req.body[field]) : null;
          } else {
            sanitizedData[field] = req.body[field];
          }
        }
      }
      
      const updated = await storage.updateOrganizationMembership(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating membership:", error);
      res.status(500).json({ message: "Failed to update membership" });
    }
  });

  // Delete organization membership (facilitador only)
  app.delete('/api/memberships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can delete memberships" });
      }
      
      const membership = await storage.getOrganizationMembership(req.params.id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      
      await storage.deleteOrganizationMembership(req.params.id);
      res.json({ message: "Membership deleted successfully" });
    } catch (error) {
      console.error("Error deleting membership:", error);
      res.status(500).json({ message: "Failed to delete membership" });
    }
  });

  // ===== CHALLENGE ROUTES =====
  
  // Get all challenges (filtered by role and query params)
  app.get('/api/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const filters: { status?: string; organizationId?: string } = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.organizationId) filters.organizationId = req.query.organizationId;
      
      const challenges = await storage.getChallenges(filters);
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // Get single challenge
  app.get('/api/challenges/:id', isAuthenticated, async (req: any, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ message: "Failed to fetch challenge" });
    }
  });

  // Create challenge (facilitador only)
  app.post('/api/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can create challenges" });
      }
      
      const challengeData = {
        ...req.body,
        createdByUserId: userId,
        // Convert date strings to Date objects, empty strings to null
        openFrom: req.body.openFrom && req.body.openFrom.trim() !== '' ? new Date(req.body.openFrom) : null,
        openUntil: req.body.openUntil && req.body.openUntil.trim() !== '' ? new Date(req.body.openUntil) : null,
      };
      
      const validationResult = insertChallengeSchema.safeParse(challengeData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid challenge data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const challenge = await storage.createChallenge(validationResult.data);
      res.status(201).json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // Update challenge (facilitador only)
  app.patch('/api/challenges/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can update challenges" });
      }
      
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Prevent editing archived challenges
      if (challenge.status === 'archived') {
        return res.status(400).json({ message: "Cannot edit archived challenges" });
      }
      
      const allowedFields = ['title', 'description', 'contextOrganizationId', 'city', 'country', 'sdgTags', 'openFrom', 'openUntil', 'maxProjects'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          // Convert date strings to Date objects, empty strings to null
          if (field === 'openFrom' || field === 'openUntil') {
            const value = req.body[field];
            sanitizedData[field] = value && value.trim && value.trim() !== '' ? new Date(value) : null;
          } else {
            sanitizedData[field] = req.body[field];
          }
        }
      }
      
      const updated = await storage.updateChallenge(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating challenge:", error);
      res.status(500).json({ message: "Failed to update challenge" });
    }
  });

  // Change challenge status (workflow action)
  app.post('/api/challenges/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can change challenge status" });
      }
      
      const { status } = req.body;
      const validStatuses = ['draft', 'open', 'in_progress', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get current challenge to validate transition
      const existingChallenge = await storage.getChallenge(req.params.id);
      if (!existingChallenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Enforce workflow: archived cannot transition
      if (existingChallenge.status === 'archived') {
        return res.status(400).json({ message: "Cannot change status of archived challenges" });
      }
      
      // Enforce valid workflow transitions
      const validTransitions: Record<string, string[]> = {
        'draft': ['open', 'archived'],
        'open': ['in_progress'],
        'in_progress': ['completed'],
        'completed': ['archived'],
      };
      
      const currentStatus = existingChallenge.status || 'draft';
      const allowedNextStatuses = validTransitions[currentStatus] || [];
      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status transition from ${currentStatus} to ${status}` });
      }
      
      const challenge = await storage.setChallengeStatus(req.params.id, status);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      res.json(challenge);
    } catch (error) {
      console.error("Error changing challenge status:", error);
      res.status(500).json({ message: "Failed to change challenge status" });
    }
  });

  // Delete challenge (facilitador only)
  app.delete('/api/challenges/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can delete challenges" });
      }
      
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      await storage.deleteChallenge(req.params.id);
      res.json({ message: "Challenge deleted successfully" });
    } catch (error) {
      console.error("Error deleting challenge:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  // ===== CHALLENGE PROJECT ROUTES =====
  
  // Get all challenge projects (filtered by query params)
  app.get('/api/challenge-projects', isAuthenticated, async (req: any, res) => {
    try {
      const filters: { challengeId?: string; status?: string; organizationId?: string } = {};
      if (req.query.challengeId) filters.challengeId = req.query.challengeId;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.organizationId) filters.organizationId = req.query.organizationId;
      
      const projects = await storage.getChallengeProjects(filters);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching challenge projects:", error);
      res.status(500).json({ message: "Failed to fetch challenge projects" });
    }
  });

  // Get projects for a specific challenge
  app.get('/api/challenges/:id/projects', isAuthenticated, async (req: any, res) => {
    try {
      const projects = await storage.getChallengeProjects({ challengeId: req.params.id });
      res.json(projects);
    } catch (error) {
      console.error("Error fetching challenge projects:", error);
      res.status(500).json({ message: "Failed to fetch challenge projects" });
    }
  });

  // Get single challenge project
  app.get('/api/challenge-projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getChallengeProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Challenge project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching challenge project:", error);
      res.status(500).json({ message: "Failed to fetch challenge project" });
    }
  });

  // Create challenge project (any authenticated user can propose)
  app.post('/api/challenge-projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if challenge is open (if linked to a challenge)
      if (req.body.challengeId) {
        const challenge = await storage.getChallenge(req.body.challengeId);
        if (!challenge) {
          return res.status(404).json({ message: "Challenge not found" });
        }
        if (challenge.status !== 'open') {
          return res.status(400).json({ message: "Challenge is not open for project submissions" });
        }
        // Check max projects limit
        if (challenge.maxProjects) {
          const count = await storage.countProjectsByChallenge(challenge.id);
          if (count >= challenge.maxProjects) {
            return res.status(400).json({ message: "Challenge has reached maximum number of projects" });
          }
        }
      }
      
      const projectData = {
        ...req.body,
        createdByUserId: userId,
        // Convert date strings to Date objects, empty strings to null
        startDate: req.body.startDate && req.body.startDate.trim() !== '' ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate && req.body.endDate.trim() !== '' ? new Date(req.body.endDate) : null,
      };
      
      const validationResult = insertChallengeProjectSchema.safeParse(projectData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const project = await storage.createChallengeProject(validationResult.data);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating challenge project:", error);
      res.status(500).json({ message: "Failed to create challenge project" });
    }
  });

  // Update challenge project
  app.patch('/api/challenge-projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getChallengeProject(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: "Challenge project not found" });
      }
      
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only creator, lead org admin, or facilitador can update
      if (project.createdByUserId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to update this project" });
      }
      
      // Prevent editing terminal state projects
      const terminalStatuses = ['completed', 'cancelled'];
      if (terminalStatuses.includes(project.status || '')) {
        return res.status(400).json({ message: "Cannot edit completed or cancelled projects" });
      }
      
      const allowedFields = ['title', 'summary', 'leadOrganizationId', 'locationCity', 'locationCountry', 'sdgTags', 'impactFocus', 'startDate', 'endDate', 'isPilot'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          // Convert date strings to Date objects, empty strings to null
          if (field === 'startDate' || field === 'endDate') {
            const value = req.body[field];
            sanitizedData[field] = value && value.trim && value.trim() !== '' ? new Date(value) : null;
          } else {
            sanitizedData[field] = req.body[field];
          }
        }
      }
      
      const updated = await storage.updateChallengeProject(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating challenge project:", error);
      res.status(500).json({ message: "Failed to update challenge project" });
    }
  });

  // Change challenge project status (workflow action)
  app.post('/api/challenge-projects/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getChallengeProject(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: "Challenge project not found" });
      }
      
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only creator, lead org admin, or facilitador can change status
      if (project.createdByUserId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to change project status" });
      }
      
      const { status } = req.body;
      const validStatuses = ['idea', 'design', 'pilot', 'active', 'completed', 'on_hold', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Enforce workflow: terminal states cannot transition
      const terminalStatuses = ['completed', 'cancelled'];
      if (terminalStatuses.includes(project.status || '')) {
        return res.status(400).json({ message: "Cannot change status of completed or cancelled projects" });
      }
      
      // Enforce valid workflow transitions
      const validTransitions: Record<string, string[]> = {
        'idea': ['design', 'on_hold', 'cancelled'],
        'design': ['pilot', 'on_hold', 'cancelled'],
        'pilot': ['active', 'on_hold', 'cancelled'],
        'active': ['completed', 'on_hold', 'cancelled'],
        'on_hold': ['idea', 'design', 'pilot', 'active', 'cancelled'],
      };
      
      const currentStatus = project.status || 'idea';
      const allowedNextStatuses = validTransitions[currentStatus] || [];
      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status transition from ${currentStatus} to ${status}` });
      }
      
      const updated = await storage.setChallengeProjectStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error changing project status:", error);
      res.status(500).json({ message: "Failed to change project status" });
    }
  });

  // Delete challenge project (facilitador or creator only)
  app.delete('/api/challenge-projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getChallengeProject(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: "Challenge project not found" });
      }
      
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (project.createdByUserId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to delete this project" });
      }
      
      await storage.deleteChallengeProject(req.params.id);
      res.json({ message: "Challenge project deleted successfully" });
    } catch (error) {
      console.error("Error deleting challenge project:", error);
      res.status(500).json({ message: "Failed to delete challenge project" });
    }
  });

  // ===== PROJECT PARTICIPANT ROUTES =====
  
  // Get participants for a project
  app.get('/api/challenge-projects/:id/participants', isAuthenticated, async (req: any, res) => {
    try {
      const participants = await storage.getProjectParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching project participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Get mentor matches for a project
  app.get('/api/challenge-projects/:id/mentor-matches', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getChallengeProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Challenge project not found" });
      }
      
      const matches = await storage.findMentorMatchesForProject(req.params.id);
      res.json(matches);
    } catch (error) {
      console.error("Error finding mentor matches:", error);
      res.status(500).json({ message: "Failed to find mentor matches" });
    }
  });

  // Get user's project participations
  app.get('/api/my-participations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const participations = await storage.getParticipantsByUser(userId);
      res.json(participations);
    } catch (error) {
      console.error("Error fetching user participations:", error);
      res.status(500).json({ message: "Failed to fetch participations" });
    }
  });

  // Add participant to project
  app.post('/api/challenge-projects/:id/participants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getChallengeProject(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: "Challenge project not found" });
      }
      
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only creator, lead org admin, or facilitador can add participants
      if (project.createdByUserId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to add participants" });
      }
      
      const participantData = {
        ...req.body,
        projectId: req.params.id,
      };
      
      const validationResult = insertProjectParticipantSchema.safeParse(participantData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid participant data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const participant = await storage.createProjectParticipant(validationResult.data);
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error adding participant:", error);
      res.status(500).json({ message: "Failed to add participant" });
    }
  });

  // Update participant
  app.patch('/api/participants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const participant = await storage.getProjectParticipant(req.params.id);
      
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      
      const project = await storage.getChallengeProject(participant.projectId);
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only project creator or facilitador can update participants
      if (project?.createdByUserId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to update participant" });
      }
      
      const allowedFields = ['role', 'assignedHours', 'isLead', 'startDate', 'endDate', 'isActive', 'notes'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateProjectParticipant(req.params.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating participant:", error);
      res.status(500).json({ message: "Failed to update participant" });
    }
  });

  // Remove participant
  app.delete('/api/participants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const participant = await storage.getProjectParticipant(req.params.id);
      
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      
      const project = await storage.getChallengeProject(participant.projectId);
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only project creator or facilitador can remove participants
      if (project?.createdByUserId !== userId && userRole !== 'facilitador') {
        return res.status(403).json({ message: "Not authorized to remove participant" });
      }
      
      await storage.deleteProjectParticipant(req.params.id);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // ===== MATCH RECORD ROUTES =====
  
  // Get match records (filtered by query params)
  app.get('/api/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      // Only facilitadores can view all matches
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can view matches" });
      }
      
      const filters: { matchType?: string; status?: string; projectId?: string; challengeId?: string } = {};
      if (req.query.matchType) filters.matchType = req.query.matchType;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.projectId) filters.projectId = req.query.projectId;
      if (req.query.challengeId) filters.challengeId = req.query.challengeId;
      
      const matches = await storage.getMatchRecords(filters);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Get single match record
  app.get('/api/matches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const match = await storage.getMatchRecord(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  // Create match record (facilitador only - intelligent matching)
  app.post('/api/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can create matches" });
      }
      
      const validationResult = insertMatchRecordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid match data", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const match = await storage.createMatchRecord(validationResult.data);
      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  // Update match status (approve/reject)
  app.post('/api/matches/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      const match = await storage.getMatchRecord(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Only facilitador or involved parties can change status
      if (userRole !== 'facilitador') {
        // Check if user is involved in this match
        const isInvolved = match.professionalUserId === userId;
        if (!isInvolved) {
          return res.status(403).json({ message: "Not authorized to change match status" });
        }
      }
      
      const { status, notes } = req.body;
      const validStatuses = ['suggested', 'pending_approval', 'accepted', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.setMatchStatus(req.params.id, status, userId, notes);
      res.json(updated);
    } catch (error) {
      console.error("Error updating match status:", error);
      res.status(500).json({ message: "Failed to update match status" });
    }
  });

  // Delete match record (facilitador only)
  app.delete('/api/matches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const userRole = userWithProfile?.userRoles?.[0]?.role?.name;
      
      if (userRole !== 'facilitador') {
        return res.status(403).json({ message: "Only facilitadores can delete matches" });
      }
      
      const match = await storage.getMatchRecord(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      await storage.deleteMatchRecord(req.params.id);
      res.json({ message: "Match deleted successfully" });
    } catch (error) {
      console.error("Error deleting match:", error);
      res.status(500).json({ message: "Failed to delete match" });
    }
  });

  // ===== EVENT ROUTES =====
  
  // Get all events (everyone can see published events)
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitadorOrMentor = userWithProfile?.userRoles?.some((ur: any) => 
        ur.role?.name === 'facilitador' || ur.role?.name === 'mentor'
      );
      
      const events = await storage.getEvents(isFacilitadorOrMentor);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Create event (facilitador or mentor only)
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const canCreate = userWithProfile?.userRoles?.some((ur: any) => 
        ur.role?.name === 'facilitador' || ur.role?.name === 'mentor'
      );
      
      if (!canCreate) {
        return res.status(403).json({ message: "Only facilitadores and mentors can create events" });
      }
      
      const eventData = {
        ...req.body,
        createdByUserId: userId,
        eventDate: new Date(req.body.eventDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      };
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Update event (creator or facilitador only)
  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.createdByUserId !== userId && !isFacilitador) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }
      
      const updateData = { ...req.body };
      if (req.body.eventDate) updateData.eventDate = new Date(req.body.eventDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      
      const updated = await storage.updateEvent(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Delete event (creator or facilitador only)
  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.createdByUserId !== userId && !isFacilitador) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }
      
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Publish event
  app.post('/api/events/:id/publish', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.createdByUserId !== userId && !isFacilitador) {
        return res.status(403).json({ message: "Not authorized to publish this event" });
      }
      
      const published = await storage.publishEvent(req.params.id);
      res.json(published);
    } catch (error) {
      console.error("Error publishing event:", error);
      res.status(500).json({ message: "Failed to publish event" });
    }
  });

  // Register for event (any authenticated user)
  app.post('/api/events/:id/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.status !== 'published') {
        return res.status(400).json({ message: "Cannot register for unpublished event" });
      }
      
      const isRegistered = await storage.isUserRegisteredForEvent(req.params.id, userId);
      if (isRegistered) {
        return res.status(400).json({ message: "Already registered for this event" });
      }
      
      if (event.maxAttendees && event.registrationCount && event.registrationCount >= event.maxAttendees) {
        return res.status(400).json({ message: "Event is full" });
      }
      
      const registration = await storage.registerForEvent(req.params.id, userId);
      res.status(201).json(registration);
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ message: "Failed to register for event" });
    }
  });

  // Cancel event registration
  app.delete('/api/events/:id/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.cancelEventRegistration(req.params.id, userId);
      res.json({ message: "Registration cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling registration:", error);
      res.status(500).json({ message: "Failed to cancel registration" });
    }
  });

  // Get user's event registrations
  app.get('/api/my-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const registrations = await storage.getUserEventRegistrations(userId);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  // Get events by date range (calendar view)
  app.get('/api/events/calendar/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month) - 1;
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      
      const events = await storage.getEventsByDateRange(startDate, endDate);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // Mark attendance for event (facilitador or event creator only)
  app.post('/api/events/:id/attendance/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(currentUserId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.createdByUserId !== currentUserId && !isFacilitador) {
        return res.status(403).json({ message: "Not authorized to mark attendance" });
      }
      
      const { attended } = req.body;
      const registration = await storage.markAttendance(req.params.id, req.params.userId, attended);
      res.json(registration);
    } catch (error) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ message: "Failed to mark attendance" });
    }
  });

  // ===== ACCELERATION PROGRAM ROUTES =====

  // Get all acceleration programs
  app.get('/api/acceleration-programs', isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const programs = await storage.getAccelerationPrograms(status ? { status } : undefined);
      res.json(programs);
    } catch (error) {
      console.error("Error fetching acceleration programs:", error);
      res.status(500).json({ message: "Failed to fetch acceleration programs" });
    }
  });

  // Get single acceleration program
  app.get('/api/acceleration-programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const program = await storage.getAccelerationProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      console.error("Error fetching acceleration program:", error);
      res.status(500).json({ message: "Failed to fetch acceleration program" });
    }
  });

  // Create acceleration program (facilitador only)
  app.post('/api/acceleration-programs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      if (!isFacilitador) {
        return res.status(403).json({ message: "Only facilitadores can create acceleration programs" });
      }
      
      const programData = {
        ...req.body,
        createdByUserId: userId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      };
      
      const program = await storage.createAccelerationProgram(programData);
      res.status(201).json(program);
    } catch (error) {
      console.error("Error creating acceleration program:", error);
      res.status(500).json({ message: "Failed to create acceleration program" });
    }
  });

  // Update acceleration program (facilitador only)
  app.patch('/api/acceleration-programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      if (!isFacilitador) {
        return res.status(403).json({ message: "Only facilitadores can update acceleration programs" });
      }
      
      const program = await storage.getAccelerationProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      const updateData = { ...req.body };
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      
      const updated = await storage.updateAccelerationProgram(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating acceleration program:", error);
      res.status(500).json({ message: "Failed to update acceleration program" });
    }
  });

  // Delete acceleration program (facilitador only)
  app.delete('/api/acceleration-programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userWithProfile = await storage.getUserWithProfile(userId);
      const isFacilitador = userWithProfile?.userRoles?.some((ur: any) => ur.role?.name === 'facilitador');
      
      if (!isFacilitador) {
        return res.status(403).json({ message: "Only facilitadores can delete acceleration programs" });
      }
      
      const program = await storage.getAccelerationProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      await storage.deleteAccelerationProgram(req.params.id);
      res.json({ message: "Acceleration program deleted successfully" });
    } catch (error) {
      console.error("Error deleting acceleration program:", error);
      res.status(500).json({ message: "Failed to delete acceleration program" });
    }
  });

  // Get events for a specific program
  app.get('/api/acceleration-programs/:id/events', isAuthenticated, async (req: any, res) => {
    try {
      const events = await storage.getEventsByProgram(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching program events:", error);
      res.status(500).json({ message: "Failed to fetch program events" });
    }
  });

  return httpServer;
}

function isProfileComplete(profile: any): boolean {
  return !!(
    profile.title &&
    profile.bio &&
    profile.country &&
    profile.city
  );
}

async function resolveTrackedUserId(req: any): Promise<string | undefined> {
  if (req.session?.localUserId) {
    return req.session.localUserId;
  }

  const oidcUserId = req.user?.claims?.sub;
  if (oidcUserId) {
    return oidcUserId;
  }

  if (req.isAuthenticated?.()) {
    return req.user?.claims?.sub;
  }

  return undefined;
}

function normalizeActivityRange(range: unknown): 'week' | 'month' | 'all' {
  if (range === 'week' || range === 'month') {
    return range;
  }
  return 'all';
}

function sanitizeTrackedPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255) return undefined;
  return trimmed;
}

function sanitizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : undefined;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getClientIp(req: any): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.trim();
  }
  return req.ip || req.socket?.remoteAddress || undefined;
}

function getLocationFromHeaders(req: any): { country?: string; region?: string; city?: string } {
  return {
    country: firstHeader(req, [
      'cloudfront-viewer-country',
      'x-vercel-ip-country',
      'cf-ipcountry',
    ]),
    region: firstHeader(req, [
      'x-vercel-ip-country-region',
      'x-appengine-region',
      'cloudfront-viewer-country-region',
    ]),
    city: firstHeader(req, [
      'x-vercel-ip-city',
      'cloudfront-viewer-city',
    ]),
  };
}

function firstHeader(req: any, names: string[]): string | undefined {
  for (const name of names) {
    const value = req.get?.(name);
    if (typeof value === 'string' && value.trim()) {
      return value.trim().slice(0, 255);
    }
  }
  return undefined;
}
