import { Router } from "express";
import {
  getCandidates,
  getMyProfile,
  updateMyProfile
} from "../controllers/profileController.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";
import { handleProfileUpload } from "../middleware/upload.js";

const router = Router();

router.get("/me", protect, getMyProfile);
router.put("/me", protect, handleProfileUpload, updateMyProfile);
router.get("/candidates", protect, requireCompletedProfile, getCandidates);

export default router;
