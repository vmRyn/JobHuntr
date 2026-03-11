import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

let io;

const isParticipant = (match, userId) =>
  match &&
  (match.seeker.toString() === userId.toString() ||
    match.company.toString() === userId.toString());

export const setupSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
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

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);

    socket.on("joinMatch", async (matchId) => {
      if (!matchId) {
        return;
      }

      const match = await Match.findById(matchId);
      if (isParticipant(match, userId)) {
        socket.join(`match:${matchId}`);
      }
    });

    socket.on("sendMessage", async (payload, callback) => {
      try {
        const { matchId, receiverId, text } = payload || {};

        if (!matchId || !receiverId || !text?.trim()) {
          if (callback) callback({ ok: false, error: "Invalid payload" });
          return;
        }

        const match = await Match.findById(matchId);
        if (!isParticipant(match, userId)) {
          if (callback) callback({ ok: false, error: "Forbidden" });
          return;
        }

        const message = await Message.create({
          match: matchId,
          sender: userId,
          receiver: receiverId,
          text: text.trim()
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "userType seekerProfile.name companyProfile.companyName")
          .populate("receiver", "userType seekerProfile.name companyProfile.companyName");

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
