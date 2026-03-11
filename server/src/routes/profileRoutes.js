import { Router } from "express";
import {
  getCandidates,
  getMyProfile,
  updateMyProfile
} from "../controllers/profileController.js";
import { protect } from "../middleware/auth.js";
import { handleProfileUpload } from "../middleware/upload.js";

const router = Router();

router.get("/me", protect, getMyProfile);
router.put("/me", protect, handleProfileUpload, updateMyProfile);
router.get("/candidates", protect, getCandidates);

export default router;
