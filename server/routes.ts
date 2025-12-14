import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

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
