import { Router } from "express";
import {
  createJob,
  deleteJob,
  getCompanyJobs,
  getJobById,
  getJobsFeed,
  updateJob
} from "../controllers/jobController.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

router.get("/", getJobsFeed);
router.get("/company", getCompanyJobs);
router.get("/:id", getJobById);
router.post("/", createJob);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

export default router;
