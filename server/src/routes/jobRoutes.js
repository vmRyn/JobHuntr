import { Router } from "express";
import {
  createJob,
  deleteJob,
  getCompanyJobs,
  getJobById,
  getJobsFeed,
  updateJob
} from "../controllers/jobController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getJobsFeed);
router.get("/company", protect, getCompanyJobs);
router.get("/:id", protect, getJobById);
router.post("/", protect, createJob);
router.put("/:id", protect, updateJob);
router.delete("/:id", protect, deleteJob);

export default router;
