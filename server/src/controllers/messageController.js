import Match from "../models/Match.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import { getIO } from "../config/socket.js";
import { toPublicUploadPath } from "../middleware/upload.js";
import { analyzeMessageSafety } from "../utils/moderationSignals.js";
import { notifyUser } from "../utils/notifications.js";
import { getCompanyAccountId } from "../utils/companyAccess.js";

const resolveParticipantId = (user) => {
  if (!user) {
    return "";
  }

  if (user.userType === "company") {
    return getCompanyAccountId(user);
  }

  return user._id?.toString?.() || "";
};

const isParticipant = (match, user) => {
  const participantId = resolveParticipantId(user);
  if (!match || !participantId) {
    return false;
  }

  return (
    match.seeker.toString() === participantId ||
    match.company.toString() === participantId
  );
};

const validReactions = new Set(["👍", "❤️", "🎉", "🔥", "👏", "👀"]);

const userProjection =
  "userType seekerProfile.name seekerProfile.profilePicture companyProfile.companyName companyProfile.logo companyProfile.isVerified";

const populateMessage = (query) =>
  query
    .populate("sender", userProjection)
    .populate("receiver", userProjection);

const sanitizeModeratedMessage = (message) => {
  const raw = typeof message.toObject === "function" ? message.toObject() : message;
  const moderationStatus = raw?.moderation?.status || "clean";

  if (moderationStatus !== "hidden" && moderationStatus !== "deleted") {
    return raw;
  }

  return {
    ...raw,
    text: moderationStatus === "deleted" ? "[Message removed]" : "[Message hidden by moderators]",
    attachment: null,
    interviewAttachment: null,
    reactions: []
  };
};

const buildRestrictionWindowHours = (riskScore) => {
  if (riskScore >= 75) return 24;
  if (riskScore >= 60) return 12;
  if (riskScore >= 45) return 6;
  return 0;
};

export const getMessagesByMatchId = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const messages = await populateMessage(
      Message.find({ match: matchId }).sort({ createdAt: 1 })
    );

    return res.json(messages.map(sanitizeModeratedMessage));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { matchId } = req.params;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const attachmentFile = req.file;
    const interviewId = typeof req.body?.interviewId === "string" ? req.body.interviewId.trim() : "";

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const senderParticipantId = resolveParticipantId(req.user);

    const sender = await User.findById(senderParticipantId).select("moderation");
    const restrictionUntil = sender?.moderation?.chatRestrictedUntil
      ? new Date(sender.moderation.chatRestrictedUntil)
      : null;

    if (restrictionUntil && restrictionUntil.getTime() > Date.now()) {
      return res.status(403).json({
        code: "CHAT_RESTRICTED",
        message: "Chat access is temporarily restricted due to safety review",
        restrictedUntil: restrictionUntil.toISOString(),
        reason: sender?.moderation?.chatRestrictionReason || "Safety review"
      });
    }

    const receiverId =
      match.seeker.toString() === senderParticipantId ? match.company : match.seeker;

    const payload = {
      match: matchId,
      sender: senderParticipantId,
      receiver: receiverId,
      text,
      readBy: [senderParticipantId]
    };

    if (interviewId) {
      if (req.user.userType !== "company" || match.company.toString() !== senderParticipantId) {
        return res.status(403).json({ message: "Only the matched company can attach interviews" });
      }

      const interview = match.interviews.id(interviewId);

      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      payload.interviewAttachment = {
        interviewId: interview._id,
        title: interview.title || "Interview",
        jobTitle: interview.jobTitle || "",
        companyName: interview.companyName || req.user.companyProfile?.companyName || "",
        startAt: interview.startAt,
        endAt: interview.endAt,
        timezone: interview.timezone || "UTC",
        location: interview.location || "",
        notes: interview.notes || "",
        status: interview.status || "scheduled"
      };
    }

    if (!text && !attachmentFile && !payload.interviewAttachment) {
      return res.status(400).json({ message: "Message text, attachment, or interviewId is required" });
    }

    if (attachmentFile) {
      payload.attachment = {
        url: toPublicUploadPath(attachmentFile.path),
        originalName: attachmentFile.originalname,
        mimeType: attachmentFile.mimetype,
        size: attachmentFile.size
      };
    }

    const safetySignals = analyzeMessageSafety(text);
    const flagged = safetySignals.riskScore >= 20;

    payload.moderation = {
      status: flagged ? "flagged" : "clean",
      riskScore: safetySignals.riskScore,
      riskLevel: safetySignals.riskLevel,
      flaggedKeywords: safetySignals.flaggedKeywords,
      matchedPatterns: safetySignals.matchedPatterns,
      flaggedByAutomation: flagged,
      flaggedAt: flagged ? new Date() : null
    };

    const message = await Message.create(payload);

    if (flagged) {
      const updatePayload = {
        $inc: {
          "moderation.flaggedMessageCount": 1,
          "moderation.riskScore": Math.max(1, Math.round(safetySignals.riskScore / 4))
        },
        $addToSet: {
          "moderation.riskSignals": {
            $each: [
              ...safetySignals.flaggedKeywords.map((keyword) => `keyword:${keyword}`),
              ...safetySignals.matchedPatterns.map((pattern) => `pattern:${pattern}`)
            ]
          }
        }
      };

      const restrictionHours = buildRestrictionWindowHours(safetySignals.riskScore);
      if (restrictionHours > 0) {
        updatePayload.$set = {
          "moderation.chatRestrictedUntil": new Date(Date.now() + restrictionHours * 60 * 60 * 1000),
          "moderation.chatRestrictionReason": "Automated safety guard triggered"
        };
      }

      await User.findByIdAndUpdate(senderParticipantId, updatePayload);

      await Report.create({
        sourceType: "automation",
        reporter: null,
        targetType: "message",
        targetMessage: message._id,
        reasonCategory:
          safetySignals.matchedPatterns.length > 0 || safetySignals.flaggedKeywords.length > 2
            ? "scam"
            : "spam",
        details: `Automated message safety alert. Risk ${safetySignals.riskScore}.`,
        priority: safetySignals.riskScore >= 60 ? "critical" : safetySignals.riskScore >= 40 ? "high" : "medium",
        automationSignals: [
          ...safetySignals.flaggedKeywords.map((keyword) => `keyword:${keyword}`),
          ...safetySignals.matchedPatterns.map((pattern) => `pattern:${pattern}`)
        ]
      });
    }

    const populatedMessage = await populateMessage(Message.findById(message._id));
    const safeMessage = sanitizeModeratedMessage(populatedMessage);

    try {
      const io = getIO();
      io.to(`match:${matchId}`).emit("newMessage", safeMessage);
      io.to(`user:${receiverId}`).emit("newMessage", safeMessage);
    } catch (socketError) {
      // Socket.io may not be available in some test contexts.
    }

    await notifyUser({
      userId: receiverId,
      type: "new_message",
      title: "New Message",
      message:
        req.user.userType === "company"
          ? `${req.user.companyProfile?.companyName || "Company"} sent you a message`
          : `${req.user.seekerProfile?.name || "Candidate"} sent you a message`,
      metadata: {
        matchId: match._id,
        jobId: match.job,
        companyId: match.company
      }
    });

    return res.status(201).json(safeMessage);
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const participantId = resolveParticipantId(req.user);

    const unreadMessages = await Message.find({
      match: matchId,
      receiver: participantId,
      readBy: { $ne: participantId }
    }).select("_id");

    const messageIds = unreadMessages.map((message) => message._id);

    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { readBy: participantId } }
      );

      try {
        const io = getIO();
        io.to(`match:${matchId}`).emit("messagesRead", {
          matchId,
          userId: participantId,
          messageIds: messageIds.map((id) => id.toString())
        });
      } catch (socketError) {
        // Socket.io may not be available in some test contexts.
      }
    }

    return res.json({
      updatedCount: messageIds.length,
      messageIds: messageIds.map((id) => id.toString())
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark messages as read" });
  }
};

export const toggleMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const emoji = typeof req.body?.emoji === "string" ? req.body.emoji.trim() : "";

    if (!validReactions.has(emoji)) {
      return res.status(400).json({ message: "Unsupported reaction emoji" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (["hidden", "deleted"].includes(message.moderation?.status)) {
      return res.status(403).json({ message: "Reactions are disabled for moderated messages" });
    }

    const match = await Match.findById(message.match);
    if (!isParticipant(match, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userId = req.user._id.toString();
    const existingIndex = message.reactions.findIndex(
      (reaction) => reaction.user.toString() === userId
    );

    let action = "added";

    if (existingIndex >= 0) {
      const existingReaction = message.reactions[existingIndex];

      if (existingReaction.emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
        action = "removed";
      } else {
        existingReaction.emoji = emoji;
        existingReaction.createdAt = new Date();
        action = "updated";
      }
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji,
        createdAt: new Date()
      });
    }

    await message.save();

    const populatedMessage = await populateMessage(Message.findById(message._id));
    const safeMessage = sanitizeModeratedMessage(populatedMessage);

    try {
      const io = getIO();
      io.to(`match:${message.match.toString()}`).emit("messageReactionUpdated", {
        matchId: message.match.toString(),
        action,
        userId,
        emoji,
        message: safeMessage
      });
    } catch (socketError) {
      // Socket.io may not be available in some test contexts.
    }

    return res.json({ action, message: safeMessage });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update reaction" });
  }
};
