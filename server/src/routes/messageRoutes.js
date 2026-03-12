import { Router } from "express";
import {
  getMessagesByMatchId,
  markMessagesAsRead,
  sendMessage,
  toggleMessageReaction
} from "../controllers/messageController.js";
import { createUserActionRateLimiter } from "../middleware/abuseRateLimit.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";
import { handleMessageAttachmentUpload } from "../middleware/upload.js";

const router = Router();

router.use(protect, requireCompletedProfile);

const messageSendLimiter = createUserActionRateLimiter({
  keyPrefix: "message-send",
  limit: 24,
  windowMs: 60 * 1000,
  message: "Too many messages too quickly. Please slow down and try again."
});

const reactionLimiter = createUserActionRateLimiter({
  keyPrefix: "message-react",
  limit: 40,
  windowMs: 60 * 1000,
  message: "Too many reaction actions. Please wait a moment."
});

router.get("/:matchId", getMessagesByMatchId);
router.post("/:matchId", messageSendLimiter, handleMessageAttachmentUpload, sendMessage);
router.post("/:matchId/read", markMessagesAsRead);
router.post("/:messageId/reactions", reactionLimiter, toggleMessageReaction);

export default router;
