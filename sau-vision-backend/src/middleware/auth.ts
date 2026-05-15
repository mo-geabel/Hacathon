import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/express";

/**
 * Middleware to protect routes that require authentication.
 * Looks for a JWT in the Authorization header: `Bearer <token>`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token is invalid or expired" });
    return;
  }
}

/**
 * Middleware to restrict routes to Admins only.
 * Must be used AFTER `requireAuth`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Access denied. Admin role required." });
    return;
  }
  next();
}

/**
 * Middleware to restrict routes to Students only.
 * Must be used AFTER `requireAuth`.
 */
export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "student") {
    res.status(403).json({ error: "Access denied. Student role required." });
    return;
  }
  next();
}
