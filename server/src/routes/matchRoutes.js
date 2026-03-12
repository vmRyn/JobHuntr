import { Router } from "express";
import {
	createMatchInterview,
	getMatchInterviews,
	getMatchedCandidateProfile,
	getMyMatches,
	updateMatchInterview,
	updateMatchStage
} from "../controllers/matchController.js";
import { protect, requireCompletedProfile, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

router.get("/", getMyMatches);
router.get("/:matchId/candidate-profile", requireRole("company"), getMatchedCandidateProfile);
router.patch("/:matchId/stage", requireRole("company"), updateMatchStage);
router.get("/:matchId/interviews", getMatchInterviews);
router.post("/:matchId/interviews", requireRole("company"), createMatchInterview);
router.patch("/:matchId/interviews/:interviewId", requireRole("company"), updateMatchInterview);

export default router;
