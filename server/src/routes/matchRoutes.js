import { Router } from "express";
import {
	createMatchInterview,
	getMatchInterviews,
	getMatchedCandidateProfile,
	getMyMatches,
	updateMatchInterview,
	updateMatchStage
} from "../controllers/matchController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getMyMatches);
router.get("/:matchId/candidate-profile", protect, requireRole("company"), getMatchedCandidateProfile);
router.patch("/:matchId/stage", protect, requireRole("company"), updateMatchStage);
router.get("/:matchId/interviews", protect, getMatchInterviews);
router.post("/:matchId/interviews", protect, requireRole("company"), createMatchInterview);
router.patch("/:matchId/interviews/:interviewId", protect, requireRole("company"), updateMatchInterview);

export default router;
