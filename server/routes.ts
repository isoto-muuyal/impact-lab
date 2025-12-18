import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
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
      
      const allowedFields = ['title', 'description', 'contextOrganizationId', 'city', 'country', 'sdgTags', 'openFrom', 'openUntil', 'maxProjects'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
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
      
      const allowedFields = ['title', 'summary', 'leadOrganizationId', 'locationCity', 'locationCountry', 'sdgTags', 'impactFocus', 'startDate', 'endDate', 'isPilot'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
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
