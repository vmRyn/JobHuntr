import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { getIO } from "../config/socket.js";
import { notifyUser } from "../utils/notifications.js";
import {
  canManagePipeline,
  getCompanyAccountId,
  getCompanyRole
} from "../utils/companyAccess.js";

const pipelineStages = new Set(["new", "screening", "interview", "offer"]);
const interviewStatuses = new Set(["scheduled", "completed", "cancelled"]);
const interviewResponseActions = new Set(["accept", "decline", "reschedule"]);
const offerResponseActions = new Set(["accept", "decline"]);
const messageUserProjection =
  "userType seekerProfile.name seekerProfile.profilePicture companyProfile.companyName companyProfile.logo companyProfile.isVerified";

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

const populateMatch = (query) =>
  query
    .populate("job", "title industry location postcode salary requiredSkills")
    .populate("seeker", "userType seekerProfile")
    .populate("company", "userType companyProfile")
    .populate("interviews.createdBy", "userType seekerProfile.name companyProfile.companyName")
    .populate("interviews.proposedBy", "userType seekerProfile.name companyProfile.companyName")
    .populate("interviews.responseBy", "userType seekerProfile.name companyProfile.companyName")
    .populate("offers.createdBy", "userType seekerProfile.name companyProfile.companyName")
    .populate("offers.decisionBy", "userType seekerProfile.name companyProfile.companyName")
    .populate("offers.auditTrail.actor", "userType seekerProfile.name companyProfile.companyName");

const parseDateOrNull = (value) => {
  if (!value) {
    return null;
  }

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

const getDisplayName = (user, fallback = "User") => {
  if (!user) {
    return fallback;
  }

  if (user.userType === "company") {
    return user.companyProfile?.companyName || fallback;
  }

  return user.seekerProfile?.name || fallback;
};

export const getMyMatches = async (req, res) => {
  try {
    const participantId = resolveParticipantId(req.user);

    const query =
      req.user.userType === "seeker"
        ? { seeker: participantId }
        : { company: participantId };

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

    const companyId = resolveParticipantId(req.user);

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: companyId
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

    const role = getCompanyRole(req.user);
    if (!canManagePipeline(role)) {
      return res.status(403).json({ message: "Only owners and recruiters can update stages" });
    }

    const stage = typeof req.body?.stage === "string" ? req.body.stage.toLowerCase().trim() : "";

    if (!pipelineStages.has(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    const companyId = resolveParticipantId(req.user);

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: companyId
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

    if (!isParticipant(match, req.user)) {
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

    const role = getCompanyRole(req.user);
    if (!canManagePipeline(role)) {
      return res.status(403).json({ message: "Only owners and recruiters can schedule interviews" });
    }

    const companyId = resolveParticipantId(req.user);

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: companyId
    })
      .populate("job", "title")
      .populate("company", "companyProfile.companyName")
      .populate("seeker", "seekerProfile.name");

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

    const jobTitle = typeof match.job === "object" && match.job?.title ? match.job.title : "Role";
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
      proposedBy: companyId,
      responseStatus: "pending",
      status: "scheduled",
      createdBy: companyId,
      lastActionAt: new Date()
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

    await notifyUser({
      userId: match.seeker,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: `${companyName} proposed an interview for ${jobTitle} on ${interviewDateDisplay}.`,
      metadata: {
        companyId: match.company?._id || match.company,
        companyName,
        jobId: match.job?._id || match.job,
        jobTitle,
        matchId: match._id,
        interviewId: interview._id,
        interviewAt: startAt,
        location
      }
    });

    emitMatchEvent("interviewCreated", {
      matchId,
      interview
    });

    try {
      const interviewMessage = await Message.create({
        match: match._id,
        sender: companyId,
        receiver: match.seeker,
        text: `${companyName} proposed an interview for ${jobTitle}.`,
        readBy: [companyId],
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

    const role = getCompanyRole(req.user);
    if (!canManagePipeline(role)) {
      return res.status(403).json({ message: "Only owners and recruiters can update interviews" });
    }

    const companyId = resolveParticipantId(req.user);

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: companyId
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

    const timingChanged =
      new Date(interview.startAt).getTime() !== nextStartAt.getTime() ||
      new Date(interview.endAt).getTime() !== nextEndAt.getTime();

    interview.startAt = nextStartAt;
    interview.endAt = nextEndAt;

    if (typeof req.body?.status === "string") {
      const nextStatus = req.body.status.toLowerCase().trim();
      if (!interviewStatuses.has(nextStatus)) {
        return res.status(400).json({ message: "Invalid interview status" });
      }
      interview.status = nextStatus;
    }

    if (timingChanged) {
      interview.responseStatus = "pending";
      interview.responseBy = null;
      interview.responseNote = "";
    }

    interview.lastActionAt = new Date();

    await match.save();

    const populatedMatch = await populateMatch(Match.findById(match._id));
    const updatedInterview = populatedMatch.interviews.id(req.params.interviewId);

    emitMatchEvent("interviewUpdated", {
      matchId: match._id.toString(),
      interview: updatedInterview
    });

    await notifyUser({
      userId: match.seeker,
      type: "interview_updated",
      title: "Interview Updated",
      message: `${getDisplayName(populatedMatch.company, "Company")} updated your interview details.`,
      metadata: {
        matchId: match._id,
        interviewId: updatedInterview._id,
        interviewAt: updatedInterview.startAt,
        location: updatedInterview.location,
        jobId: match.job,
        companyId: match.company
      }
    });

    return res.json(updatedInterview);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update interview" });
  }
};

export const respondToMatchInterview = async (req, res) => {
  try {
    const action = String(req.body?.action || "").trim().toLowerCase();
    const responseNote = String(req.body?.responseNote || "").trim();

    if (!interviewResponseActions.has(action)) {
      return res.status(400).json({ message: "action must be accept, decline, or reschedule" });
    }

    const match = await Match.findById(req.params.matchId)
      .populate("job", "title")
      .populate("company", "companyProfile.companyName")
      .populate("seeker", "seekerProfile.name");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.user.userType === "company") {
      const role = getCompanyRole(req.user);
      if (!canManagePipeline(role)) {
        return res.status(403).json({ message: "Only owners and recruiters can respond to interviews" });
      }
    }

    const actorId = resolveParticipantId(req.user);

    const interview = match.interviews.id(req.params.interviewId);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (action === "accept") {
      interview.responseStatus = "accepted";
      interview.status = "scheduled";
      interview.rescheduleProposal = {
        startAt: null,
        endAt: null,
        timezone: "",
        location: ""
      };
    }

    if (action === "decline") {
      interview.responseStatus = "declined";
      interview.status = "cancelled";
      interview.rescheduleProposal = {
        startAt: null,
        endAt: null,
        timezone: "",
        location: ""
      };
    }

    if (action === "reschedule") {
      const proposedStartAt = parseDateOrNull(req.body?.proposedStartAt);
      const proposedEndAt = parseDateOrNull(req.body?.proposedEndAt);
      const proposedTimezone = String(req.body?.proposedTimezone || interview.timezone || "UTC").trim();
      const proposedLocation = String(req.body?.proposedLocation || interview.location || "").trim();

      if (!proposedStartAt || !proposedEndAt || proposedStartAt >= proposedEndAt) {
        return res.status(400).json({ message: "Valid proposedStartAt and proposedEndAt are required for reschedule" });
      }

      interview.responseStatus = "reschedule_requested";
      interview.status = "scheduled";
      interview.rescheduleProposal = {
        startAt: proposedStartAt,
        endAt: proposedEndAt,
        timezone: proposedTimezone,
        location: proposedLocation
      };
      interview.startAt = proposedStartAt;
      interview.endAt = proposedEndAt;
      interview.timezone = proposedTimezone;
      interview.location = proposedLocation;
    }

    interview.responseBy = actorId;
    interview.responseNote = responseNote;
    interview.lastActionAt = new Date();

    await match.save();

    const refreshedMatch = await populateMatch(Match.findById(match._id));
    const refreshedInterview = refreshedMatch.interviews.id(req.params.interviewId);

    const counterpartId =
      match.seeker.toString() === actorId ? match.company.toString() : match.seeker.toString();

    await notifyUser({
      userId: counterpartId,
      type: "interview_response",
      title: "Interview Response",
      message: `${getDisplayName(req.user, "User")} ${action}ed an interview proposal.`,
      metadata: {
        matchId: match._id,
        interviewId: refreshedInterview._id,
        interviewAt: refreshedInterview.startAt,
        location: refreshedInterview.location,
        companyId: match.company,
        jobId: match.job
      }
    });

    emitMatchEvent("interviewResponded", {
      matchId: match._id.toString(),
      interview: refreshedInterview,
      action,
      actorId
    });

    return res.json(refreshedInterview);
  } catch (error) {
    return res.status(500).json({ message: "Failed to respond to interview" });
  }
};

export const getMatchOffers = async (req, res) => {
  try {
    const match = await populateMatch(Match.findById(req.params.matchId));
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!isParticipant(match, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const offers = [...(match.offers || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json(offers);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load offers" });
  }
};

export const createMatchOffer = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can create offers" });
    }

    const role = getCompanyRole(req.user);
    if (!canManagePipeline(role)) {
      return res.status(403).json({ message: "Only owners and recruiters can create offers" });
    }

    const companyId = resolveParticipantId(req.user);

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: companyId
    })
      .populate("job", "title")
      .populate("company", "companyProfile.companyName")
      .populate("seeker", "seekerProfile.name");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const title = String(req.body?.title || "Offer").trim() || "Offer";
    const compensation = String(req.body?.compensation || "").trim();
    const currency = String(req.body?.currency || "USD").trim() || "USD";
    const employmentType = String(req.body?.employmentType || "full_time").trim() || "full_time";
    const startDate = req.body?.startDate ? parseDateOrNull(req.body.startDate) : null;
    const notes = String(req.body?.notes || "").trim();

    if (!compensation) {
      return res.status(400).json({ message: "compensation is required" });
    }

    match.offers.push({
      title,
      compensation,
      currency,
      employmentType,
      startDate,
      notes,
      status: "pending",
      createdBy: companyId,
      auditTrail: [
        {
          actor: companyId,
          action: "created",
          note: notes || "Offer created"
        }
      ]
    });

    if (match.stage !== "offer") {
      match.stage = "offer";
    }

    const offerId = match.offers[match.offers.length - 1]._id.toString();
    await match.save();

    const refreshedMatch = await populateMatch(Match.findById(match._id));
    const offer = refreshedMatch.offers.id(offerId);

    await notifyUser({
      userId: match.seeker,
      type: "offer_created",
      title: "New Offer Received",
      message: `${getDisplayName(refreshedMatch.company, "Company")} sent an offer for ${refreshedMatch.job?.title || "a role"}.`,
      metadata: {
        matchId: match._id,
        jobId: refreshedMatch.job?._id || match.job,
        jobTitle: refreshedMatch.job?.title || "",
        companyId: match.company,
        companyName: refreshedMatch.company?.companyProfile?.companyName || "Company",
        offerId: offer._id
      }
    });

    emitMatchEvent("offerCreated", {
      matchId: match._id.toString(),
      offer
    });

    return res.status(201).json(offer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create offer" });
  }
};

export const updateMatchOffer = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can update offers" });
    }

    const role = getCompanyRole(req.user);
    if (!canManagePipeline(role)) {
      return res.status(403).json({ message: "Only owners and recruiters can update offers" });
    }

    const companyId = resolveParticipantId(req.user);

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: companyId
    }).populate("job", "title");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const offer = match.offers.id(req.params.offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "pending" && req.body?.status !== "withdrawn") {
      return res.status(400).json({ message: "Only pending offers can be edited" });
    }

    if (req.body?.title !== undefined) {
      offer.title = String(req.body.title || "").trim() || offer.title;
    }

    if (req.body?.compensation !== undefined) {
      const compensation = String(req.body.compensation || "").trim();
      if (!compensation) {
        return res.status(400).json({ message: "compensation cannot be empty" });
      }

      offer.compensation = compensation;
    }

    if (req.body?.currency !== undefined) {
      offer.currency = String(req.body.currency || "").trim() || offer.currency;
    }

    if (req.body?.employmentType !== undefined) {
      offer.employmentType = String(req.body.employmentType || "").trim() || offer.employmentType;
    }

    if (req.body?.startDate !== undefined) {
      offer.startDate = req.body.startDate ? parseDateOrNull(req.body.startDate) : null;
    }

    if (req.body?.notes !== undefined) {
      offer.notes = String(req.body.notes || "").trim();
    }

    if (req.body?.status !== undefined) {
      const nextStatus = String(req.body.status || "").trim().toLowerCase();
      if (nextStatus !== "withdrawn") {
        return res.status(400).json({ message: "Only withdrawn status can be applied by company" });
      }

      offer.status = "withdrawn";
      offer.decisionBy = companyId;
      offer.decisionNote = String(req.body?.decisionNote || "").trim();
    }

    offer.auditTrail.push({
      actor: companyId,
      action: req.body?.status === "withdrawn" ? "withdrawn" : "updated",
      note: String(req.body?.auditNote || req.body?.notes || "").trim()
    });

    await match.save();

    const refreshedMatch = await populateMatch(Match.findById(match._id));
    const refreshedOffer = refreshedMatch.offers.id(req.params.offerId);

    await notifyUser({
      userId: match.seeker,
      type: "offer_updated",
      title: "Offer Updated",
      message: `${getDisplayName(req.user, "Company")} updated your offer details.`,
      metadata: {
        matchId: match._id,
        jobId: match.job,
        offerId: refreshedOffer._id,
        companyId: match.company
      }
    });

    emitMatchEvent("offerUpdated", {
      matchId: match._id.toString(),
      offer: refreshedOffer
    });

    return res.json(refreshedOffer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update offer" });
  }
};

export const respondToMatchOffer = async (req, res) => {
  try {
    if (req.user.userType !== "seeker") {
      return res.status(403).json({ message: "Only seekers can respond to offers" });
    }

    const action = String(req.body?.action || "").trim().toLowerCase();
    if (!offerResponseActions.has(action)) {
      return res.status(400).json({ message: "action must be accept or decline" });
    }

    const decisionNote = String(req.body?.decisionNote || "").trim();

    const match = await Match.findOne({
      _id: req.params.matchId,
      seeker: req.user._id
    })
      .populate("job", "title")
      .populate("company", "companyProfile.companyName");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const offer = match.offers.id(req.params.offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({ message: "Offer has already been decided" });
    }

    offer.status = action === "accept" ? "accepted" : "declined";
    offer.decisionBy = req.user._id;
    offer.decisionNote = decisionNote;
    offer.auditTrail.push({
      actor: req.user._id,
      action: offer.status,
      note: decisionNote
    });

    await match.save();

    const refreshedMatch = await populateMatch(Match.findById(match._id));
    const refreshedOffer = refreshedMatch.offers.id(req.params.offerId);

    await notifyUser({
      userId: match.company,
      type: "offer_updated",
      title: "Offer Decision",
      message: `${getDisplayName(req.user, "Candidate")} ${offer.status} your offer.`,
      metadata: {
        matchId: match._id,
        jobId: match.job,
        offerId: refreshedOffer._id,
        companyId: match.company
      }
    });

    emitMatchEvent("offerResponded", {
      matchId: match._id.toString(),
      offer: refreshedOffer,
      action: offer.status,
      actorId: req.user._id.toString()
    });

    return res.json(refreshedOffer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to respond to offer" });
  }
};
