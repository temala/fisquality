import passport from "passport";
import session from "express-session";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production
      maxAge: sessionTtl,
    },
  });
}

async function upsertUserLocal(username: string) {
  // Simple local user object for testing with more realistic data
  const userData = {
    id: username,
    email: `${username}@example.com`,
    firstName: username,
    lastName: "Local",
    profileImageUrl: "",
  };
  
  await storage.upsertUser(userData);
  return userData;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // --------------------
  // Passport Local Strategy
  // --------------------
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Accept a single local test user: admin / admin
        if (username === "admin" && password === "admin") {
          const userData = await upsertUserLocal(username);
          
          // Create user object with claims nested structure
          const userWithClaims = {
            // Standard user properties
            id: username,
            username: username,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            
            // Nested claims object (like JWT structure)
            claims: {
              sub: username, // Subject - unique user identifier
              iss: "local-auth", // Issuer - who issued this token/session
              aud: "fiscalflows", // Audience - intended recipient
              iat: Math.floor(Date.now() / 1000), // Issued at (Unix timestamp)
              exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // Expires in 7 days
              role: "admin",
              permissions: ["read", "write", "delete"],
              tenant: "default",
              plan: "premium"
            },
            
            // Keep sub at root level for compatibility
            sub: username
          };
          
          return done(null, userWithClaims);
        }
        return done(null, false, { message: "Incorrect username or password." });
      } catch (error: any) {
        return done(error);
      }
    })
  );

  // Fixed serialization/deserialization
  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, cb) => {
    try {
      // Recreate user object with nested claims structure
      const userWithClaims = {
        // Standard user properties
        id: id,
        username: id,
        email: `${id}@example.com`,
        firstName: id,
        lastName: "Local",
        profileImageUrl: "",
        
        // Nested claims object
        claims: {
          sub: id, // Subject
          iss: "local-auth", // Issuer
          aud: "fiscalflows", // Audience
          iat: Math.floor(Date.now() / 1000), // Issued at
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // Expires in 7 days
          role: "admin",
          permissions: ["read", "write", "delete"],
          tenant: "default",
          plan: "premium"
        },
        
        // Keep sub at root level for compatibility
        sub: id
      };
      
      cb(null, userWithClaims);
    } catch (error: any) {
      cb(error);
    }
  });

  // --------------------
  // Routes
  // --------------------
  app.get("/api/login", (req, res) => {
    // Check if already authenticated
    if (req.isAuthenticated()) {
      return res.redirect("/");
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login</title>
      </head>
      <body>
        <h2>Login</h2>
        <form method="post" action="/api/login">
          <div>
            <input name="username" placeholder="Username" required />
          </div>
          <div>
            <input name="password" type="password" placeholder="Password" required />
          </div>
          <div>
            <button type="submit">Login</button>
          </div>
        </form>
        <p><small>Test credentials: admin / admin</small></p>
      </body>
      </html>
    `);
  });

  app.post(
    "/api/login",
    (req, res, next) => {
      // Add error handling
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Login Failed</title>
            </head>
            <body>
              <h2>Login Failed</h2>
              <p>${info?.message || "Authentication failed"}</p>
              <a href="/api/login">Try Again</a>
            </body>
            </html>
          `);
        }
        req.logIn(user, (err: any) => {
          if (err) {
            return next(err);
          }
          return res.redirect("/");
        });
      })(req, res, next);
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/api/login");
    });
  });

  // Add routes to check authentication status
  app.get("/api/user", isAuthenticated, (req, res) => {
    res.json(req.user);
  });

  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    res.json(req.user);
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};