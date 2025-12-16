import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertCourseSchema, insertMentorshipSchema, insertMentorshipSessionSchema, insertOrganizationSchema, insertOrganizationMembershipSchema } from "@shared/schema";

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
