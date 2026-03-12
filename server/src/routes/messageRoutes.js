import { Router } from "express";
import {
  getMessagesByMatchId,
  markMessagesAsRead,
  sendMessage,
  toggleMessageReaction
} from "../controllers/messageController.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";
import { handleMessageAttachmentUpload } from "../middleware/upload.js";

const router = Router();

router.use(protect, requireCompletedProfile);

router.get("/:matchId", getMessagesByMatchId);
router.post("/:matchId", handleMessageAttachmentUpload, sendMessage);
router.post("/:matchId/read", markMessagesAsRead);
router.post("/:messageId/reactions", toggleMessageReaction);

export default router;
