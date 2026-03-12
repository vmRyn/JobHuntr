import { Router } from "express";
import {
  createJob,
  deleteJob,
  getCompanyJobs,
  getJobById,
  getJobsFeed,
  updateJob
} from "../controllers/jobController.js";
import { createUserActionRateLimiter } from "../middleware/abuseRateLimit.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

const jobWriteLimiter = createUserActionRateLimiter({
  keyPrefix: "job-write",
  limit: 20,
  windowMs: 60 * 60 * 1000,
  message: "Too many job publishing actions in a short period. Please try later."
});

router.get("/", getJobsFeed);
router.get("/company", getCompanyJobs);
router.get("/:id", getJobById);
router.post("/", jobWriteLimiter, createJob);
router.put("/:id", jobWriteLimiter, updateJob);
router.delete("/:id", deleteJob);

export default router;
