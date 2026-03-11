import { Router } from "express";
import { swipeCandidate, swipeJob } from "../controllers/swipeController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/job/:jobId", protect, swipeJob);
router.post("/candidate/:candidateId", protect, swipeCandidate);

export default router;
