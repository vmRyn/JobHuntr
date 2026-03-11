import { Router } from "express";
import {
	createMatchInterview,
	getMatchInterviews,
	getMatchedCandidateProfile,
	getMyMatches,
	updateMatchInterview,
	updateMatchStage
} from "../controllers/matchController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getMyMatches);
router.get("/:matchId/candidate-profile", protect, getMatchedCandidateProfile);
router.patch("/:matchId/stage", protect, updateMatchStage);
router.get("/:matchId/interviews", protect, getMatchInterviews);
router.post("/:matchId/interviews", protect, createMatchInterview);
router.patch("/:matchId/interviews/:interviewId", protect, updateMatchInterview);

export default router;
