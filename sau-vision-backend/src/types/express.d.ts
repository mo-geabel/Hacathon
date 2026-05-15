import { Request } from "express";

export interface JwtPayload {
  id: string;
  universityId: string;
  email: string;
  role: "student" | "admin";
  facultyId?: string; // Present if role === "admin"
  faculty?: string;   // Present if role === "student"
}

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
    }
  }
}
