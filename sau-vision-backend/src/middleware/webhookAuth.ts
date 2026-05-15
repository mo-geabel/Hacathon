import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Verifies the HMAC-SHA256 signature NovaVision attaches to every webhook.
 * Header: X-NovaVision-Signature: sha256=<hex_digest>
 * Requires express.raw() on the route to preserve the raw body.
 */
export function verifyNovaVisionSignature(req: Request, res: Response, next: NextFunction): void {
  const rawSignature = req.headers["x-novavision-signature"] as string;
  const secret = process.env.NOVAVISION_WEBHOOK_SECRET;

  if (!rawSignature || !secret) {
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  const [algorithm, digest] = rawSignature.split("=");
  if (algorithm !== "sha256") { res.status(401).json({ error: "Unsupported algorithm" }); return; }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.body as Buffer);
  const expected = hmac.digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"))) {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }
  next();
}

/**
 * Verifies the Bearer token puq.ai sends in the Authorization header.
 */
export function verifyPuqAiToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"] as string;
  const expected = process.env.PUQAI_WEBHOOK_TOKEN;

  if (!authHeader || !expected) { res.status(401).json({ error: "Missing auth header" }); return; }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
  next();
}
