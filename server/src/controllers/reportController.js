import mongoose from "mongoose";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Job from "../models/Job.js";

const reasonToPriority = {
  scam: "high",
  harassment: "high",
  hate_or_abuse: "critical",
  misleading_job: "high",
  spam: "medium",
  duplicate: "medium",
  other: "low"
};

const targetExists = async ({ targetType, targetId }) => {
  if (targetType === "job") {
    const job = await Job.findById(targetId).select("_id");
    return Boolean(job);
  }

  if (targetType === "company") {
    const company = await User.findOne({ _id: targetId, userType: "company" }).select("_id");
    return Boolean(company);
  }

  if (targetType === "message") {
    const message = await Message.findById(targetId).select("_id");
    return Boolean(message);
  }

  return false;
};

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reasonCategory, details } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({ message: "targetType and targetId are required" });
    }

    if (!["job", "company", "message"].includes(targetType)) {
      return res.status(400).json({ message: "targetType must be job, company, or message" });
    }

    if (!mongoose.Types.ObjectId.isValid(String(targetId))) {
      return res.status(400).json({ message: "Invalid targetId" });
    }

    if (targetType === "message") {
      const message = await Message.findById(targetId).select("sender receiver");

      if (!message) {
        return res.status(404).json({ message: "Target not found" });
      }

      const requesterId = String(req.user._id);
      const isParticipant =
        String(message.sender) === requesterId || String(message.receiver) === requesterId;

      if (!isParticipant) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const exists = await targetExists({ targetType, targetId });
    if (!exists) {
      return res.status(404).json({ message: "Target not found" });
    }

    const reportPayload = {
      sourceType: "user",
      reporter: req.user._id,
      targetType,
      reasonCategory: reasonCategory || "other",
      details: typeof details === "string" ? details.trim() : "",
      priority: reasonToPriority[reasonCategory] || "medium"
    };

    if (targetType === "job") {
      reportPayload.targetJob = targetId;
    } else if (targetType === "company") {
      reportPayload.targetUser = targetId;
    } else if (targetType === "message") {
      reportPayload.targetMessage = targetId;
    }

    const report = await Report.create(reportPayload);

    return res.status(201).json({
      data: {
        id: String(report._id),
        status: report.status,
        priority: report.priority,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit report" });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      data: reports.map((report) => ({
        id: String(report._id),
        targetType: report.targetType,
        reasonCategory: report.reasonCategory,
        status: report.status,
        priority: report.priority,
        createdAt: report.createdAt,
        resolutionNote: report.resolutionNote || ""
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load reports" });
  }
};
