import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { attachProfileCompletion, getProfileCompletionState } from "../utils/profileCompletion.js";
import { getCompanyAccountId } from "../utils/companyAccess.js";

let io;

const userProjection =
  "userType seekerProfile.name seekerProfile.profilePicture companyProfile.companyName companyProfile.logo companyProfile.isVerified";

const getParticipantId = (user) => {
  if (!user) {
    return "";
  }

  if (user.userType === "company") {
    return getCompanyAccountId(user);
  }

  return user._id?.toString?.() || "";
};

const isParticipant = (match, user) => {
  const participantId = getParticipantId(user);
  return (
    match &&
    (match.seeker.toString() === participantId ||
      match.company.toString() === participantId)
  );
};

export const setupSocket = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      const completion = getProfileCompletionState(user);
      if (!completion.profileCompleted) {
        return next(new Error("Profile setup required"));
      }

      socket.user = attachProfileCompletion(user);
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const participantId = getParticipantId(socket.user);
    socket.join(`user:${userId}`);

    if (participantId && participantId !== userId) {
      socket.join(`user:${participantId}`);
    }

    socket.on("joinMatch", async (matchId) => {
      if (!matchId) {
        return;
      }

      const match = await Match.findById(matchId);
      if (isParticipant(match, socket.user)) {
        socket.join(`match:${matchId}`);
      }
    });

    socket.on("typingStart", async ({ matchId }) => {
      if (!matchId) {
        return;
      }

      const match = await Match.findById(matchId);
      if (!isParticipant(match, socket.user)) {
        return;
      }

      socket.to(`match:${matchId}`).emit("typing", {
        matchId,
        userId,
        isTyping: true
      });
    });

    socket.on("typingStop", async ({ matchId }) => {
      if (!matchId) {
        return;
      }

      const match = await Match.findById(matchId);
      if (!isParticipant(match, socket.user)) {
        return;
      }

      socket.to(`match:${matchId}`).emit("typing", {
        matchId,
        userId,
        isTyping: false
      });
    });

    socket.on("sendMessage", async (payload, callback) => {
      try {
        const { matchId, receiverId, text } = payload || {};

        if (!matchId || !receiverId || !text?.trim()) {
          if (callback) callback({ ok: false, error: "Invalid payload" });
          return;
        }

        const match = await Match.findById(matchId);
        if (!isParticipant(match, socket.user)) {
          if (callback) callback({ ok: false, error: "Forbidden" });
          return;
        }

        const senderId = participantId || userId;

        const message = await Message.create({
          match: matchId,
          sender: senderId,
          receiver: receiverId,
          text: text.trim(),
          readBy: [senderId]
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", userProjection)
          .populate("receiver", userProjection);

        io.to(`match:${matchId}`).emit("newMessage", populatedMessage);
        io.to(`user:${receiverId}`).emit("newMessage", populatedMessage);

        if (callback) callback({ ok: true, message: populatedMessage });
      } catch (error) {
        if (callback) callback({ ok: false, error: "Failed to send message" });
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
