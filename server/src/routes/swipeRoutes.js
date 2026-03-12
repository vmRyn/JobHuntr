import { Router } from "express";
import { swipeCandidate, swipeJob } from "../controllers/swipeController.js";
import { createUserActionRateLimiter } from "../middleware/abuseRateLimit.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

const swipeLimiter = createUserActionRateLimiter({
	keyPrefix: "swipe-action",
	limit: 80,
	windowMs: 60 * 1000,
	message: "You are swiping too fast. Please slow down a little."
});

router.post("/job/:jobId", swipeLimiter, swipeJob);
router.post("/candidate/:candidateId", swipeLimiter, swipeCandidate);

export default router;
