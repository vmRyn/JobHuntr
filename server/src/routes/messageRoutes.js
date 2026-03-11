import { Router } from "express";
import {
  getMessagesByMatchId,
  markMessagesAsRead,
  sendMessage,
  toggleMessageReaction
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";
import { handleMessageAttachmentUpload } from "../middleware/upload.js";

const router = Router();

router.get("/:matchId", protect, getMessagesByMatchId);
router.post("/:matchId", protect, handleMessageAttachmentUpload, sendMessage);
router.post("/:matchId/read", protect, markMessagesAsRead);
router.post("/:messageId/reactions", protect, toggleMessageReaction);

export default router;
