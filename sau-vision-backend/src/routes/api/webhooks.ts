import { Router, Request, Response } from "express";

const router = Router();

// POST /api/webhooks/puqai
// Receives the asynchronous result from the external puq.ai workflow
router.post("/puqai", (req: Request, res: Response) => {
  console.log("\n🔔 Received Webhook from puq.ai!");
  console.log(JSON.stringify(req.body, null, 2));

  // In a real application, you would lookup the booking or request by ID
  // and update it with this new data. For the Hackathon presentation, 
  // printing it to the console is enough to prove the connection works!
  
  res.status(200).json({ message: "Webhook received successfully!" });
});

export default router;
