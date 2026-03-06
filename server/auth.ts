import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  fetchUserInfo,
  randomPKCECodeVerifier,
  randomState,
  skipSubjectCheck,
  type Configuration,
} from "openid-client";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    localUserId?: string;
    googleOauthState?: string;
    googlePkceCodeVerifier?: string;
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_ISSUER = new URL("https://accounts.google.com");

let googleConfigPromise: Promise<Configuration> | null = null;

function isGoogleConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET && !!GOOGLE_REDIRECT_URI;
}

async function getGoogleConfig(): Promise<Configuration> {
  if (!isGoogleConfigured()) {
    throw new Error("Google OAuth is not configured");
  }

  if (!googleConfigPromise) {
    googleConfigPromise = discovery(
      GOOGLE_ISSUER,
      GOOGLE_CLIENT_ID!,
      { client_secret: GOOGLE_CLIENT_SECRET! },
    );
  }

  return googleConfigPromise;
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

  app.get("/api/auth/google", async (req, res) => {
    try {
      if (!isGoogleConfigured()) {
        return res.status(503).json({ message: "Google OAuth is not configured" });
      }

      const config = await getGoogleConfig();
      const state = randomState();
      const codeVerifier = randomPKCECodeVerifier();
      const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

      req.session.googleOauthState = state;
      req.session.googlePkceCodeVerifier = codeVerifier;

      const authorizationUrl = buildAuthorizationUrl(config, {
        scope: "openid email profile",
        redirect_uri: GOOGLE_REDIRECT_URI!,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      req.session.save(() => {
        res.redirect(authorizationUrl.href);
      });
    } catch (error) {
      console.error("Error starting Google OAuth:", error);
      return res.status(500).json({ message: "Failed to start Google login" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      if (!isGoogleConfigured()) {
        return res.status(503).json({ message: "Google OAuth is not configured" });
      }

      const expectedState = req.session.googleOauthState;
      const pkceCodeVerifier = req.session.googlePkceCodeVerifier;
      if (!expectedState || !pkceCodeVerifier) {
        return res.status(400).json({ message: "Google OAuth session is missing" });
      }

      const state = typeof req.query?.state === "string" ? req.query.state : "";
      if (state !== expectedState) {
        return res.status(400).json({ message: "Invalid OAuth state" });
      }

      const config = await getGoogleConfig();
      const currentUrl = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);

      const tokenResponse = await authorizationCodeGrant(
        config,
        currentUrl,
        {
          expectedState,
          pkceCodeVerifier,
        },
      );

      const accessToken = tokenResponse.access_token;
      if (!accessToken) {
        return res.status(400).json({ message: "Missing access token from Google" });
      }

      const idTokenClaims = tokenResponse.claims();
      const expectedSubject =
        typeof idTokenClaims?.sub === "string" && idTokenClaims.sub.length > 0
          ? idTokenClaims.sub
          : skipSubjectCheck;

      const userInfo = await fetchUserInfo(config, accessToken, expectedSubject);
      const email = typeof userInfo.email === "string" ? userInfo.email.trim().toLowerCase() : "";
      if (!email) {
        return res.status(400).json({ message: "Google account has no email" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.upsertUser({
          username: email,
          email,
          firstName: typeof userInfo.given_name === "string" ? userInfo.given_name : undefined,
          lastName: typeof userInfo.family_name === "string" ? userInfo.family_name : undefined,
          profileImageUrl: typeof userInfo.picture === "string" ? userInfo.picture : undefined,
          status: "active",
          lastAccessAt: new Date(),
        });
      }

      req.session.localUserId = user.id;
      req.session.googleOauthState = undefined;
      req.session.googlePkceCodeVerifier = undefined;
      req.session.save(() => {
        res.redirect("/");
      });
    } catch (error) {
      console.error("Error completing Google OAuth:", error);
      return res.status(500).json({ message: "Failed to complete Google login" });
    }
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
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : null;
      const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : null;
      const username = email;

      if (!password || !email) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Email already exists" });
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
