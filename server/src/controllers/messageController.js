import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { getIO } from "../config/socket.js";

const isParticipant = (match, userId) =>
  match &&
  (match.seeker.toString() === userId.toString() ||
    match.company.toString() === userId.toString());

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

    const messages = await Message.find({ match: matchId })
      .sort({ createdAt: 1 })
      .populate("sender", "userType seekerProfile.name companyProfile.companyName")
      .populate("receiver", "userType seekerProfile.name companyProfile.companyName");

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const receiverId =
      match.seeker.toString() === req.user._id.toString() ? match.company : match.seeker;

    const message = await Message.create({
      match: matchId,
      sender: req.user._id,
      receiver: receiverId,
      text: text.trim()
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "userType seekerProfile.name companyProfile.companyName")
      .populate("receiver", "userType seekerProfile.name companyProfile.companyName");

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
