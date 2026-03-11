import { Router } from "express";
import {
	getMatchedCandidateProfile,
	getMyMatches
} from "../controllers/matchController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getMyMatches);
router.get("/:matchId/candidate-profile", protect, getMatchedCandidateProfile);

export default router;
