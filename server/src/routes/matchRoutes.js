import { Router } from "express";
import {
	createMatchInterview,
	createMatchOffer,
	getMatchOffers,
	getMatchInterviews,
	getMatchedCandidateProfile,
	getMyMatches,
	respondToMatchInterview,
	respondToMatchOffer,
	updateMatchOffer,
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
router.post("/:matchId/interviews/:interviewId/respond", respondToMatchInterview);

router.get("/:matchId/offers", getMatchOffers);
router.post("/:matchId/offers", requireRole("company"), createMatchOffer);
router.patch("/:matchId/offers/:offerId", requireRole("company"), updateMatchOffer);
router.patch("/:matchId/offers/:offerId/respond", requireRole("seeker"), respondToMatchOffer);

export default router;
