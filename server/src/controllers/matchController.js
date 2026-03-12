import Match from "../models/Match.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import { getIO } from "../config/socket.js";

const pipelineStages = new Set(["new", "screening", "interview", "offer"]);
const interviewStatuses = new Set(["scheduled", "completed", "cancelled"]);
const messageUserProjection =
  "userType seekerProfile.name seekerProfile.profilePicture companyProfile.companyName companyProfile.logo companyProfile.isVerified";

const isParticipant = (match, userId) =>
  match &&
  (match.seeker.toString() === userId.toString() ||
    match.company.toString() === userId.toString());

const populateMatch = (query) =>
  query
    .populate("job", "title industry location postcode salary requiredSkills")
    .populate("seeker", "userType seekerProfile")
    .populate("company", "userType companyProfile")
    .populate("interviews.createdBy", "userType seekerProfile.name companyProfile.companyName");

const parseDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatInterviewDate = (value, timezone = "UTC") => {
  const parsed = parseDateOrNull(value);

  if (!parsed) {
    return "";
  }

  try {
    return parsed.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "UTC"
    });
  } catch (error) {
    return parsed.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }
};

const emitMatchEvent = (eventName, payload) => {
  try {
    const io = getIO();
    io.to(`match:${payload.matchId}`).emit(eventName, payload);
  } catch (socketError) {
    // Socket.io may not be available in some test contexts.
  }
};

const emitUserEvent = (userId, eventName, payload) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(eventName, payload);
  } catch (socketError) {
    // Socket.io may not be available in some test contexts.
  }
};

const populateMessage = (query) =>
  query
    .populate("sender", messageUserProjection)
    .populate("receiver", messageUserProjection);

const emitNewMessage = (matchId, receiverId, message) => {
  try {
    const io = getIO();
    io.to(`match:${matchId}`).emit("newMessage", message);
    io.to(`user:${receiverId}`).emit("newMessage", message);
  } catch (socketError) {
    // Socket.io may not be available in some test contexts.
  }
};

export const getMyMatches = async (req, res) => {
  try {
    const query =
      req.user.userType === "seeker"
        ? { seeker: req.user._id }
        : { company: req.user._id };

    const matches = await populateMatch(Match.find(query).sort({ updatedAt: -1 }));

    return res.json(matches);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load matches" });
  }
};

export const getMatchedCandidateProfile = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can access candidate profiles" });
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: req.user._id
    })
      .populate("job", "title industry location postcode salary")
      .populate("seeker", "userType seekerProfile");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    return res.json({
      matchId: match._id,
      job: match.job,
      seeker: match.seeker
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load candidate profile" });
  }
};

export const updateMatchStage = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can update match stages" });
    }

    const stage = typeof req.body?.stage === "string" ? req.body.stage.toLowerCase().trim() : "";

    if (!pipelineStages.has(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: req.user._id
    });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    match.stage = stage;
    await match.save();

    const populatedMatch = await populateMatch(Match.findById(match._id));

    emitMatchEvent("matchStageUpdated", {
      matchId: match._id.toString(),
      stage,
      updatedBy: req.user._id.toString()
    });

    return res.json(populatedMatch);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update match stage" });
  }
};

export const getMatchInterviews = async (req, res) => {
  try {
    const match = await populateMatch(Match.findById(req.params.matchId));

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const interviews = [...(match.interviews || [])].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    return res.json(interviews);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load interviews" });
  }
};

export const createMatchInterview = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can schedule interviews" });
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: req.user._id
    })
      .populate("job", "title")
      .populate("company", "companyProfile.companyName");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const title = typeof req.body?.title === "string" && req.body.title.trim() ? req.body.title.trim() : "Interview";
    const startAt = parseDateOrNull(req.body?.startAt);
    const endAt = parseDateOrNull(req.body?.endAt);
    const timezone = typeof req.body?.timezone === "string" && req.body.timezone.trim() ? req.body.timezone.trim() : "UTC";
    const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";

    if (!startAt || !endAt) {
      return res.status(400).json({ message: "startAt and endAt are required" });
    }

    if (startAt >= endAt) {
      return res.status(400).json({ message: "endAt must be after startAt" });
    }

    const jobTitle =
      typeof match.job === "object" && match.job?.title
        ? match.job.title
        : "Role";
    const companyName =
      req.user.companyProfile?.companyName ||
      (typeof match.company === "object" ? match.company?.companyProfile?.companyName : "") ||
      "Company";

    match.interviews.push({
      title,
      jobTitle,
      companyName,
      startAt,
      endAt,
      timezone,
      location,
      notes,
      status: "scheduled",
      createdBy: req.user._id
    });

    if (match.stage !== "interview") {
      match.stage = "interview";
    }

    const interviewId = match.interviews[match.interviews.length - 1]._id.toString();
    await match.save();

    const populatedMatch = await populateMatch(Match.findById(match._id));
    const interview = populatedMatch.interviews.id(interviewId);

    const matchId = match._id.toString();
    const seekerId = match.seeker.toString();
    const interviewDateDisplay = formatInterviewDate(startAt, timezone);
    const notification = await Notification.create({
      user: match.seeker,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: `${companyName} scheduled an interview for ${jobTitle} on ${interviewDateDisplay}.`,
      company: match.company?._id || match.company,
      companyName,
      job: match.job?._id || match.job,
      jobTitle,
      match: match._id,
      interviewId: interview._id,
      interviewAt: startAt,
      location
    });

    const unreadCount = await Notification.countDocuments({
      user: match.seeker,
      isRead: false
    });

    emitMatchEvent("interviewCreated", {
      matchId,
      interview
    });

    emitUserEvent(seekerId, "notificationCreated", {
      notification,
      unreadCount
    });

    try {
      const interviewMessage = await Message.create({
        match: match._id,
        sender: req.user._id,
        receiver: match.seeker,
        text: `${companyName} scheduled an interview for ${jobTitle}.`,
        readBy: [req.user._id],
        interviewAttachment: {
          interviewId: interview._id,
          title: interview.title || "Interview",
          jobTitle,
          companyName,
          startAt,
          endAt,
          timezone,
          location,
          notes,
          status: interview.status || "scheduled"
        }
      });

      const populatedInterviewMessage = await populateMessage(
        Message.findById(interviewMessage._id)
      );

      emitNewMessage(matchId, seekerId, populatedInterviewMessage);
    } catch (messageError) {
      // Interview scheduling should still succeed even if message mirroring fails.
    }

    return res.status(201).json(interview);
  } catch (error) {
    return res.status(500).json({ message: "Failed to schedule interview" });
  }
};

export const updateMatchInterview = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can update interviews" });
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: req.user._id
    });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const interview = match.interviews.id(req.params.interviewId);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (typeof req.body?.title === "string" && req.body.title.trim()) {
      interview.title = req.body.title.trim();
    }

    if (typeof req.body?.location === "string") {
      interview.location = req.body.location.trim();
    }

    if (typeof req.body?.notes === "string") {
      interview.notes = req.body.notes.trim();
    }

    if (typeof req.body?.timezone === "string" && req.body.timezone.trim()) {
      interview.timezone = req.body.timezone.trim();
    }

    const nextStartAt = req.body?.startAt ? parseDateOrNull(req.body.startAt) : interview.startAt;
    const nextEndAt = req.body?.endAt ? parseDateOrNull(req.body.endAt) : interview.endAt;

    if (!nextStartAt || !nextEndAt) {
      return res.status(400).json({ message: "Invalid interview date values" });
    }

    if (nextStartAt >= nextEndAt) {
      return res.status(400).json({ message: "endAt must be after startAt" });
    }

    interview.startAt = nextStartAt;
    interview.endAt = nextEndAt;

    if (typeof req.body?.status === "string") {
      const nextStatus = req.body.status.toLowerCase().trim();
      if (!interviewStatuses.has(nextStatus)) {
        return res.status(400).json({ message: "Invalid interview status" });
      }
      interview.status = nextStatus;
    }

    await match.save();

    const populatedMatch = await populateMatch(Match.findById(match._id));
    const updatedInterview = populatedMatch.interviews.id(req.params.interviewId);

    emitMatchEvent("interviewUpdated", {
      matchId: match._id.toString(),
      interview: updatedInterview
    });

    return res.json(updatedInterview);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update interview" });
  }
};
