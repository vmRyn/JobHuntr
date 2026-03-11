import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { getIO } from "../config/socket.js";
import { toPublicUploadPath } from "../middleware/upload.js";

const isParticipant = (match, userId) =>
  match &&
  (match.seeker.toString() === userId.toString() ||
    match.company.toString() === userId.toString());

const validReactions = new Set(["👍", "❤️", "🎉", "🔥", "👏", "👀"]);

const userProjection =
  "userType seekerProfile.name seekerProfile.profilePicture companyProfile.companyName companyProfile.logo";

const populateMessage = (query) =>
  query
    .populate("sender", userProjection)
    .populate("receiver", userProjection);

export const getMessagesByMatchId = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const messages = await populateMessage(
      Message.find({ match: matchId }).sort({ createdAt: 1 })
    );

    return res.json(messages);
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

    if (!isParticipant(match, req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const receiverId =
      match.seeker.toString() === req.user._id.toString() ? match.company : match.seeker;

    const payload = {
      match: matchId,
      sender: req.user._id,
      receiver: receiverId,
      text,
      readBy: [req.user._id]
    };

    if (interviewId) {
      if (req.user.userType !== "company" || match.company.toString() !== req.user._id.toString()) {
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

    const message = await Message.create(payload);

    const populatedMessage = await populateMessage(Message.findById(message._id));

    try {
      const io = getIO();
      io.to(`match:${matchId}`).emit("newMessage", populatedMessage);
      io.to(`user:${receiverId}`).emit("newMessage", populatedMessage);
    } catch (socketError) {
      // Socket.io may not be available in some test contexts.
    }

    return res.status(201).json(populatedMessage);
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

    if (!isParticipant(match, req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const unreadMessages = await Message.find({
      match: matchId,
      receiver: req.user._id,
      readBy: { $ne: req.user._id }
    }).select("_id");

    const messageIds = unreadMessages.map((message) => message._id);

    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { readBy: req.user._id } }
      );

      try {
        const io = getIO();
        io.to(`match:${matchId}`).emit("messagesRead", {
          matchId,
          userId: req.user._id.toString(),
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

    const match = await Match.findById(message.match);
    if (!isParticipant(match, req.user._id)) {
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

    try {
      const io = getIO();
      io.to(`match:${message.match.toString()}`).emit("messageReactionUpdated", {
        matchId: message.match.toString(),
        action,
        userId,
        emoji,
        message: populatedMessage
      });
    } catch (socketError) {
      // Socket.io may not be available in some test contexts.
    }

    return res.json({ action, message: populatedMessage });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update reaction" });
  }
};
