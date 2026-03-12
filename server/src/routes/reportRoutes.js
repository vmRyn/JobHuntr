import { Router } from "express";
import { createReport, getMyReports } from "../controllers/reportController.js";
import { createUserActionRateLimiter } from "../middleware/abuseRateLimit.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

const reportLimiter = createUserActionRateLimiter({
  keyPrefix: "report-create",
  limit: 8,
  windowMs: 60 * 1000,
  message: "Too many reports submitted. Please wait a minute and try again."
});

router.get("/me", getMyReports);
router.post("/", reportLimiter, createReport);

export default router;
