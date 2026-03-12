import { Router } from "express";
import { swipeCandidate, swipeJob } from "../controllers/swipeController.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

router.post("/job/:jobId", swipeJob);
router.post("/candidate/:candidateId", swipeCandidate);

export default router;
