import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../db/client";
import { students, admins } from "../../db/schema";
import { eq } from "drizzle-orm";
import { JwtPayload } from "../../types/express";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// Helper for type-safe route handlers to avoid unhandled promises
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── Registration ─────────────────────────────────────────────────────────────

router.post("/register/student", asyncHandler(async (req: Request, res: Response) => {
  const { universityId, fullName, email, password, faculty, programme } = req.body;

  if (!universityId || !fullName || !email || !password || !faculty) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Check if student already exists
  const existing = await db.select().from(students).where(eq(students.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [newStudent] = await db.insert(students).values({
    universityId,
    fullName,
    email,
    passwordHash,
    faculty,
    programme
  }).returning();

  res.status(201).json({
    message: "Student registered successfully",
    student: {
      id: newStudent.id,
      universityId: newStudent.universityId,
      fullName: newStudent.fullName,
      email: newStudent.email,
      faculty: newStudent.faculty
    }
  });
}));

// ── Login ────────────────────────────────────────────────────────────────────

router.post("/login", asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  // Try finding a student first
  let user = null;
  let role: "student" | "admin" = "student";
  let facultyId: string | undefined;
  let facultyStr: string | undefined;

  const studentMatch = await db.select().from(students).where(eq(students.email, email)).limit(1);
  
  if (studentMatch.length > 0) {
    user = studentMatch[0];
    facultyStr = user.faculty;
  } else {
    // Try finding an admin
    const adminMatch = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    if (adminMatch.length > 0) {
      user = adminMatch[0];
      role = "admin";
      facultyId = user.facultyId;
    }
  }

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account is deactivated" });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Build the payload
  const payload: JwtPayload = {
    id: user.id,
    universityId: user.universityId,
    email: user.email,
    role,
  };

  if (role === "admin") payload.facultyId = facultyId;
  if (role === "student") payload.faculty = facultyStr;

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      universityId: user.universityId,
      fullName: user.fullName,
      email: user.email,
      role,
      ...(role === "student" ? { eventRating: (user as any).eventRating } : {})
    }
  });
}));

// ── Profile (Protected Route Example) ────────────────────────────────────────

import { requireAuth } from "../../middleware/auth";

router.get("/me", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  // req.user is guaranteed to exist because of requireAuth
  const userId = req.user!.id;
  const role = req.user!.role;

  if (role === "student") {
    const [student] = await db.select().from(students).where(eq(students.id, userId)).limit(1);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    
    // Omit passwordHash from response
    const { passwordHash, ...safeStudent } = student;
    res.json({ role, profile: safeStudent });
  } else {
    const [admin] = await db.select().from(admins).where(eq(admins.id, userId)).limit(1);
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }
    
    const { passwordHash, ...safeAdmin } = admin;
    res.json({ role, profile: safeAdmin });
  }
}));

export default router;
