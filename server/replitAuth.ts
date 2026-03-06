import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    localUserId?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl / 1000,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });

  app.post("/api/login", async (req, res) => {
    try {
      const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      const user = await storage.validateLocalUser(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.localUserId = user.id;
      return res.json({ ok: true });
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : null;
      const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : null;

      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const user = await storage.upsertUser({
        username,
        password,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        status: "active",
      });

      req.session.localUserId = user.id;
      return res.status(201).json({ ok: true });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Username or email already exists" });
      }

      console.error("Error during register:", error);
      return res.status(500).json({ message: "Register failed" });
    }
  });

  const logoutHandler: RequestHandler = (req, res) => {
    req.session.localUserId = undefined;
    req.session.save(() => {
      res.redirect("/");
    });
  };

  app.get("/api/logout", logoutHandler);
  app.post("/api/logout", logoutHandler);
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = req.session?.localUserId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    req.session.localUserId = undefined;
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = {
    claims: { sub: user.id },
    local: true,
  };

  return next();
};

export const isImpactLabAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.session?.localUserId;
  if (!userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const user = await storage.getUser(userId);
  if (!user || user.username !== "impactlab") {
    return res.status(403).json({ message: "Forbidden" });
  }

  (req as any).user = {
    claims: { sub: user.id },
    local: true,
  };

  return next();
};
