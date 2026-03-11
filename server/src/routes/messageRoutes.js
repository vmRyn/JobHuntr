import { Router } from "express";
import {
  getMessagesByMatchId,
  sendMessage
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/:matchId", protect, getMessagesByMatchId);
router.post("/:matchId", protect, sendMessage);

export default router;
