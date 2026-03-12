import { Router } from "express";
import {
  getMySavedItems,
  removeSavedItem,
  saveCandidate,
  saveJob
} from "../controllers/savedController.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

router.get("/", getMySavedItems);
router.post("/job/:jobId", saveJob);
router.post("/candidate/:candidateId", saveCandidate);
router.delete("/:savedItemId", removeSavedItem);

export default router;
