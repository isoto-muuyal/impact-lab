import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertCourseSchema } from "@shared/schema";

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
