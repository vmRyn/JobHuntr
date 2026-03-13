import mongoose from "mongoose";
import Appeal from "../models/Appeal.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import Job from "../models/Job.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import { notifyUser } from "../utils/notifications.js";

const toPositiveInt = (value, fallback, maxValue = 100) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit))
});

const getCompanySummary = (company, activeJobCount = 0) => ({
  id: String(company._id),
  email: company.email,
  createdAt: company.createdAt,
  updatedAt: company.updatedAt,
  companyName: company.companyProfile?.companyName || "Company",
  industry: company.companyProfile?.industry || "",
  logo: company.companyProfile?.logo || "",
  isVerified: Boolean(company.companyProfile?.isVerified),
  verifiedAt: company.companyProfile?.verifiedAt || null,
  isSuspended: Boolean(company.isSuspended),
  suspensionReason: company.suspensionReason || "",
  activeJobCount
});

const addAuditLog = async ({
  adminId,
  actionType,
  targetUser,
  targetJob,
  targetMessage,
  metadata = {}
}) => {
  await AdminAuditLog.create({
    admin: adminId,
    actionType,
    targetUser: targetUser || null,
    targetJob: targetJob || null,
    targetMessage: targetMessage || null,
    metadata
  });
};

export const getAdminOverview = async (_req, res) => {
  try {
    const [
      totalCompanies,
      totalSeekers,
      totalAdmins,
      verifiedCompanies,
      pendingCompanyVerifications,
      suspendedUsers,
      activeJobs,
      inactiveJobs,
      totalMatches,
      openReports,
      pendingAppeals,
      flaggedMessages,
      jobsPendingReview
    ] = await Promise.all([
      User.countDocuments({ userType: "company" }),
      User.countDocuments({ userType: "seeker" }),
      User.countDocuments({ userType: "admin" }),
      User.countDocuments({
        userType: "company",
        "companyProfile.isVerified": true
      }),
      User.countDocuments({
        userType: "company",
        "companyProfile.isVerified": { $ne: true },
        isSuspended: { $ne: true }
      }),
      User.countDocuments({ isSuspended: true }),
      Job.countDocuments({ isActive: true }),
      Job.countDocuments({ isActive: false }),
      Match.countDocuments(),
      Report.countDocuments({ status: { $in: ["open", "in_review"] } }),
      Appeal.countDocuments({ status: "pending" }),
      Message.countDocuments({ "moderation.status": { $in: ["flagged", "hidden", "deleted"] } }),
      Job.countDocuments({ "moderation.status": { $in: ["pending_review", "flagged"] } })
    ]);

    return res.json({
      data: {
        totalCompanies,
        totalSeekers,
        totalAdmins,
        verifiedCompanies,
        pendingCompanyVerifications,
        suspendedUsers,
        activeJobs,
        inactiveJobs,
        totalMatches,
        openReports,
        pendingAppeals,
        flaggedMessages,
        jobsPendingReview
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load admin overview" });
  }
};

export const listCompanies = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "all";
    const queryText = String(req.query.q || "").trim();

    const filters = { userType: "company" };

    if (status === "verified") {
      filters["companyProfile.isVerified"] = true;
    } else if (status === "pending") {
      filters["companyProfile.isVerified"] = { $ne: true };
      filters.isSuspended = { $ne: true };
    } else if (status === "suspended") {
      filters.isSuspended = true;
    }

    if (queryText) {
      const searchRegex = new RegExp(escapeRegExp(queryText), "i");
      filters.$or = [
        { email: searchRegex },
        { "companyProfile.companyName": searchRegex },
        { "companyProfile.industry": searchRegex }
      ];
    }

    const [total, companies] = await Promise.all([
      User.countDocuments(filters),
      User.find(filters)
        .select("email companyProfile isSuspended suspensionReason createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const companyIds = companies.map((company) => company._id);
    const counts = await Job.aggregate([
      {
        $match: {
          company: { $in: companyIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: "$company",
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

    return res.json({
      data: companies.map((company) =>
        getCompanySummary(company, countMap.get(String(company._id)) || 0)
      ),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load companies" });
  }
};

export const setCompanyVerification = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { verified } = req.body;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company id" });
    }

    if (typeof verified !== "boolean") {
      return res.status(400).json({ message: "verified must be a boolean" });
    }

    const company = await User.findOne({
      _id: companyId,
      userType: "company"
    }).select("email companyProfile isSuspended suspensionReason createdAt updatedAt");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.companyProfile.isVerified = verified;
    company.companyProfile.verifiedAt = verified ? new Date() : null;
    company.companyProfile.verifiedBy = verified ? req.user._id : null;
    await company.save();

    const activeJobCount = await Job.countDocuments({
      company: company._id,
      isActive: true
    });

    await addAuditLog({
      adminId: req.user._id,
      actionType: verified ? "verify_company" : "remove_company_verification",
      targetUser: company._id,
      metadata: {
        companyName: company.companyProfile?.companyName || "Company",
        email: company.email
      }
    });

    return res.json({
      data: getCompanySummary(company.toObject(), activeJobCount)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update company verification" });
  }
};

export const setUserSuspension = async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspended, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (String(req.user._id) === userId) {
      return res.status(400).json({ message: "Admins cannot suspend themselves" });
    }

    if (typeof suspended !== "boolean") {
      return res.status(400).json({ message: "suspended must be a boolean" });
    }

    const targetUser = await User.findById(userId).select(
      "email userType seekerProfile.name companyProfile.companyName isSuspended suspensionReason"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    targetUser.isSuspended = suspended;
    targetUser.suspensionReason = suspended ? String(reason || "").trim() : "";
    await targetUser.save();

    let deactivatedJobCount = 0;

    if (suspended && targetUser.userType === "company") {
      const deactivation = await Job.updateMany(
        { company: targetUser._id, isActive: true },
        { $set: { isActive: false } }
      );

      deactivatedJobCount = deactivation.modifiedCount || 0;
    }

    await addAuditLog({
      adminId: req.user._id,
      actionType: suspended ? "suspend_user" : "unsuspend_user",
      targetUser: targetUser._id,
      metadata: {
        userType: targetUser.userType,
        email: targetUser.email,
        reason: targetUser.suspensionReason || "",
        deactivatedJobCount
      }
    });

    await notifyUser({
      userId: targetUser._id,
      type: "moderation_action",
      title: suspended ? "Account Suspended" : "Account Restored",
      message: suspended
        ? `Your account has been suspended${targetUser.suspensionReason ? `: ${targetUser.suspensionReason}` : "."}`
        : "Your account suspension has been lifted.",
      metadata: {
        action: suspended ? "suspend_user" : "unsuspend_user",
        reason: targetUser.suspensionReason || ""
      }
    });

    return res.json({
      data: {
        id: String(targetUser._id),
        email: targetUser.email,
        userType: targetUser.userType,
        displayName:
          targetUser.userType === "company"
            ? targetUser.companyProfile?.companyName || "Company"
            : targetUser.seekerProfile?.name || "User",
        isSuspended: targetUser.isSuspended,
        suspensionReason: targetUser.suspensionReason,
        deactivatedJobCount
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update suspension" });
  }
};

export const listJobs = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "all";
    const queryText = String(req.query.q || "").trim();
    const companyId = String(req.query.companyId || "").trim();

    const filters = {};

    if (status === "active") {
      filters.isActive = true;
    } else if (status === "inactive") {
      filters.isActive = false;
    } else if (status === "review") {
      filters["moderation.status"] = { $in: ["pending_review", "flagged"] };
    } else if (["pending_review", "flagged", "rejected", "approved"].includes(status)) {
      filters["moderation.status"] = status;
    }

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filters.company = companyId;
    }

    if (queryText) {
      const searchRegex = new RegExp(escapeRegExp(queryText), "i");
      filters.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { industry: searchRegex },
        { location: searchRegex }
      ];
    }

    const [total, jobs] = await Promise.all([
      Job.countDocuments(filters),
      Job.find(filters)
        .populate(
          "company",
          "email companyProfile.companyName companyProfile.logo companyProfile.isVerified"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.json({
      data: jobs.map((job) => ({
        id: String(job._id),
        title: job.title,
        industry: job.industry || "",
        location: job.location || "",
        salary: job.salary || "",
        postcode: job.postcode || "",
        isActive: Boolean(job.isActive),
        moderationStatus: job.moderation?.status || "approved",
        moderationFlags: Array.isArray(job.moderation?.flags) ? job.moderation.flags : [],
        qualityScore: typeof job.moderation?.qualityScore === "number" ? job.moderation.qualityScore : 100,
        duplicateOf: job.moderation?.duplicateOf ? String(job.moderation.duplicateOf) : "",
        moderationNotes: job.moderation?.notes || "",
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        company: {
          id: String(job.company?._id || ""),
          email: job.company?.email || "",
          companyName: job.company?.companyProfile?.companyName || "Company",
          logo: job.company?.companyProfile?.logo || "",
          isVerified: Boolean(job.company?.companyProfile?.isVerified)
        }
      })),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load jobs" });
  }
};

export const setJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job id" });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const job = await Job.findById(jobId).populate(
      "company",
      "email companyProfile.companyName companyProfile.isVerified"
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    job.isActive = isActive;
    if (isActive && job.moderation?.status !== "approved") {
      job.moderation = {
        ...(job.moderation || {}),
        status: "approved",
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        notes: "Activated by admin moderation action"
      };
    }
    await job.save();

    await addAuditLog({
      adminId: req.user._id,
      actionType: isActive ? "activate_job" : "deactivate_job",
      targetUser: job.company?._id || null,
      targetJob: job._id,
      metadata: {
        title: job.title,
        companyName: job.company?.companyProfile?.companyName || "Company"
      }
    });

    return res.json({
      data: {
        id: String(job._id),
        isActive: job.isActive,
        title: job.title
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update job status" });
  }
};

export const setJobModeration = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { moderationStatus, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job id" });
    }

    if (!["approved", "pending_review", "flagged", "rejected"].includes(moderationStatus)) {
      return res.status(400).json({ message: "Invalid moderationStatus" });
    }

    const job = await Job.findById(jobId).populate(
      "company",
      "email companyProfile.companyName companyProfile.isVerified"
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    job.moderation = {
      ...(job.moderation || {}),
      status: moderationStatus,
      notes: typeof notes === "string" ? notes.trim() : "",
      reviewedBy: req.user._id,
      reviewedAt: new Date()
    };

    if (moderationStatus === "approved") {
      job.isActive = true;
    } else if (moderationStatus === "pending_review" || moderationStatus === "rejected") {
      job.isActive = false;
    }

    await job.save();

    await addAuditLog({
      adminId: req.user._id,
      actionType: "review_job_moderation",
      targetUser: job.company?._id || null,
      targetJob: job._id,
      metadata: {
        title: job.title,
        moderationStatus,
        notes: job.moderation?.notes || ""
      }
    });

    return res.json({
      data: {
        id: String(job._id),
        isActive: job.isActive,
        moderationStatus: job.moderation?.status || "approved",
        moderationNotes: job.moderation?.notes || ""
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to review job moderation" });
  }
};

export const listReports = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "all";
    const targetType = typeof req.query.targetType === "string" ? req.query.targetType.toLowerCase() : "all";
    const priority = typeof req.query.priority === "string" ? req.query.priority.toLowerCase() : "all";

    const filters = {};

    if (["open", "in_review", "resolved", "dismissed"].includes(status)) {
      filters.status = status;
    }

    if (["job", "company", "message"].includes(targetType)) {
      filters.targetType = targetType;
    }

    if (["low", "medium", "high", "critical"].includes(priority)) {
      filters.priority = priority;
    }

    const [total, reports] = await Promise.all([
      Report.countDocuments(filters),
      Report.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("reporter", "email userType")
        .populate("targetUser", "email userType companyProfile.companyName seekerProfile.name")
        .populate("targetJob", "title")
        .populate("targetMessage", "text moderation sender")
        .lean()
    ]);

    return res.json({
      data: reports.map((report) => ({
        id: String(report._id),
        sourceType: report.sourceType,
        targetType: report.targetType,
        reasonCategory: report.reasonCategory,
        details: report.details || "",
        priority: report.priority,
        status: report.status,
        automationSignals: report.automationSignals || [],
        createdAt: report.createdAt,
        reporter: report.reporter
          ? {
              id: String(report.reporter._id),
              email: report.reporter.email,
              userType: report.reporter.userType
            }
          : null,
        targetUser: report.targetUser
          ? {
              id: String(report.targetUser._id),
              email: report.targetUser.email,
              userType: report.targetUser.userType,
              displayName:
                report.targetUser.userType === "company"
                  ? report.targetUser.companyProfile?.companyName || "Company"
                  : report.targetUser.seekerProfile?.name || "User"
            }
          : null,
        targetJob: report.targetJob
          ? {
              id: String(report.targetJob._id),
              title: report.targetJob.title
            }
          : null,
        targetMessage: report.targetMessage
          ? {
              id: String(report.targetMessage._id),
              text: report.targetMessage.text || "",
              moderationStatus: report.targetMessage.moderation?.status || "clean"
            }
          : null,
        reviewedAt: report.reviewedAt,
        resolutionNote: report.resolutionNote || "",
        resolutionAction: report.resolutionAction || ""
      })),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load reports" });
  }
};

export const reviewReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, resolutionNote, resolutionAction } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report id" });
    }

    if (!["in_review", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid report status" });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.resolutionNote = typeof resolutionNote === "string" ? resolutionNote.trim() : "";
    report.resolutionAction = typeof resolutionAction === "string" ? resolutionAction.trim() : "";
    await report.save();

    await addAuditLog({
      adminId: req.user._id,
      actionType: "review_report",
      targetUser: report.targetUser || null,
      targetJob: report.targetJob || null,
      targetMessage: report.targetMessage || null,
      metadata: {
        reportId: String(report._id),
        status: report.status,
        resolutionAction: report.resolutionAction || ""
      }
    });

    return res.json({
      data: {
        id: String(report._id),
        status: report.status,
        reviewedAt: report.reviewedAt,
        resolutionNote: report.resolutionNote,
        resolutionAction: report.resolutionAction
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to review report" });
  }
};

export const listAppeals = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "all";

    const filters = {};
    if (["pending", "approved", "rejected"].includes(status)) {
      filters.status = status;
    }

    const [total, appeals] = await Promise.all([
      Appeal.countDocuments(filters),
      Appeal.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("appellant", "email userType companyProfile.companyName seekerProfile.name")
        .lean()
    ]);

    return res.json({
      data: appeals.map((appeal) => ({
        id: String(appeal._id),
        email: appeal.email,
        userType: appeal.userType,
        status: appeal.status,
        sourceType: appeal.sourceType,
        suspensionReasonSnapshot: appeal.suspensionReasonSnapshot || "",
        appealReason: appeal.appealReason,
        createdAt: appeal.createdAt,
        reviewedAt: appeal.reviewedAt,
        resolutionNote: appeal.resolutionNote || "",
        appellant: appeal.appellant
          ? {
              id: String(appeal.appellant._id),
              email: appeal.appellant.email,
              userType: appeal.appellant.userType,
              displayName:
                appeal.appellant.userType === "company"
                  ? appeal.appellant.companyProfile?.companyName || "Company"
                  : appeal.appellant.seekerProfile?.name || "User"
            }
          : null
      })),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load appeals" });
  }
};

export const reviewAppeal = async (req, res) => {
  try {
    const { appealId } = req.params;
    const { status, resolutionNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(appealId)) {
      return res.status(400).json({ message: "Invalid appeal id" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid appeal status" });
    }

    const appeal = await Appeal.findById(appealId);
    if (!appeal) {
      return res.status(404).json({ message: "Appeal not found" });
    }

    appeal.status = status;
    appeal.reviewedBy = req.user._id;
    appeal.reviewedAt = new Date();
    appeal.resolutionNote = typeof resolutionNote === "string" ? resolutionNote.trim() : "";
    await appeal.save();

    let unsuspended = false;
    if (status === "approved") {
      const targetUser = await User.findOne({ email: appeal.email }).select(
        "_id isSuspended suspensionReason moderation"
      );

      if (targetUser?.isSuspended) {
        targetUser.isSuspended = false;
        targetUser.suspensionReason = "";
        targetUser.moderation = {
          ...(targetUser.moderation || {}),
          chatRestrictedUntil: null,
          chatRestrictionReason: ""
        };
        await targetUser.save();
        unsuspended = true;
      }
    }

    await addAuditLog({
      adminId: req.user._id,
      actionType: "review_appeal",
      targetUser: appeal.appellant || null,
      metadata: {
        appealId: String(appeal._id),
        status,
        unsuspended
      }
    });

    const appealTargetUser = appeal.appellant || (await User.findOne({ email: appeal.email }).select("_id"))?._id;
    if (appealTargetUser) {
      await notifyUser({
        userId: appealTargetUser,
        type: "moderation_action",
        title: "Appeal Reviewed",
        message:
          status === "approved"
            ? "Your appeal was approved and your account access has been restored."
            : "Your appeal was reviewed and declined.",
        metadata: {
          action: "appeal_review",
          status,
          appealId: String(appeal._id)
        }
      });
    }

    return res.json({
      data: {
        id: String(appeal._id),
        status: appeal.status,
        reviewedAt: appeal.reviewedAt,
        resolutionNote: appeal.resolutionNote,
        unsuspended
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to review appeal" });
  }
};

export const listFlaggedMessages = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "all";

    const filters = {
      "moderation.status": { $in: ["flagged", "hidden", "deleted"] }
    };

    if (["flagged", "hidden", "deleted"].includes(status)) {
      filters["moderation.status"] = status;
    }

    const [total, messages] = await Promise.all([
      Message.countDocuments(filters),
      Message.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sender", "email userType companyProfile.companyName seekerProfile.name moderation")
        .populate("receiver", "email userType companyProfile.companyName seekerProfile.name")
        .lean()
    ]);

    return res.json({
      data: messages.map((message) => ({
        id: String(message._id),
        matchId: String(message.match),
        text: message.text || "",
        createdAt: message.createdAt,
        moderationStatus: message.moderation?.status || "clean",
        riskScore: message.moderation?.riskScore || 0,
        riskLevel: message.moderation?.riskLevel || "low",
        flaggedKeywords: message.moderation?.flaggedKeywords || [],
        matchedPatterns: message.moderation?.matchedPatterns || [],
        sender: message.sender
          ? {
              id: String(message.sender._id),
              email: message.sender.email,
              userType: message.sender.userType,
              displayName:
                message.sender.userType === "company"
                  ? message.sender.companyProfile?.companyName || "Company"
                  : message.sender.seekerProfile?.name || "User",
              chatRestrictedUntil: message.sender.moderation?.chatRestrictedUntil || null
            }
          : null
      })),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load flagged messages" });
  }
};

export const moderateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const allowedActions = [
      "hide",
      "restore",
      "delete",
      "restrict_sender_24h",
      "restrict_sender_72h",
      "clear_flags"
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({ message: "Invalid moderation action" });
    }

    const message = await Message.findById(messageId).populate("sender", "moderation");
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const actionReason = typeof reason === "string" ? reason.trim() : "";
    const now = new Date();

    if (action === "hide") {
      message.moderation = {
        ...(message.moderation || {}),
        status: "hidden",
        adminAction: {
          action,
          reason: actionReason,
          admin: req.user._id,
          actedAt: now
        }
      };
      message.text = "[Message hidden by moderators]";
      message.attachment = null;
      message.interviewAttachment = null;
    }

    if (action === "delete") {
      message.moderation = {
        ...(message.moderation || {}),
        status: "deleted",
        adminAction: {
          action,
          reason: actionReason,
          admin: req.user._id,
          actedAt: now
        }
      };
      message.text = "[Message removed]";
      message.attachment = null;
      message.interviewAttachment = null;
      message.reactions = [];
    }

    if (action === "restore") {
      message.moderation = {
        ...(message.moderation || {}),
        status: "clean",
        adminAction: {
          action,
          reason: actionReason,
          admin: req.user._id,
          actedAt: now
        }
      };
    }

    if (action === "clear_flags") {
      message.moderation = {
        ...(message.moderation || {}),
        status: "clean",
        riskScore: 0,
        riskLevel: "low",
        flaggedKeywords: [],
        matchedPatterns: [],
        flaggedByAutomation: false,
        flaggedAt: null,
        adminAction: {
          action,
          reason: actionReason,
          admin: req.user._id,
          actedAt: now
        }
      };
    }

    if (action === "restrict_sender_24h" || action === "restrict_sender_72h") {
      const durationHours = action === "restrict_sender_24h" ? 24 : 72;

      await User.findByIdAndUpdate(message.sender?._id || message.sender, {
        $set: {
          "moderation.chatRestrictedUntil": new Date(Date.now() + durationHours * 60 * 60 * 1000),
          "moderation.chatRestrictionReason": actionReason || "Admin safety restriction"
        },
        $inc: {
          "moderation.abusiveActionCount": 1
        }
      });

      message.moderation = {
        ...(message.moderation || {}),
        status: "hidden",
        adminAction: {
          action,
          reason: actionReason,
          admin: req.user._id,
          actedAt: now
        }
      };
      message.text = "[Message hidden by moderators]";
      message.attachment = null;
      message.interviewAttachment = null;
    }

    await message.save();

    await addAuditLog({
      adminId: req.user._id,
      actionType: "moderate_message",
      targetUser: message.sender?._id || message.sender,
      targetMessage: message._id,
      metadata: {
        action,
        reason: actionReason
      }
    });

    if (message.sender?._id || message.sender) {
      await notifyUser({
        userId: message.sender?._id || message.sender,
        type: "moderation_action",
        title: "Message Moderation Action",
        message: `A moderation action was applied to one of your messages: ${action.replaceAll("_", " ")}.`,
        metadata: {
          action,
          reason: actionReason,
          messageId: String(message._id)
        }
      });
    }

    return res.json({
      data: {
        id: String(message._id),
        moderationStatus: message.moderation?.status || "clean",
        action
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to moderate message" });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 30, 100);

    const logs = await AdminAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("admin", "email adminProfile.name")
      .populate("targetUser", "email userType companyProfile.companyName seekerProfile.name")
      .populate("targetJob", "title")
      .populate("targetMessage", "text")
      .lean();

    return res.json({
      data: logs.map((log) => ({
        id: String(log._id),
        actionType: log.actionType,
        createdAt: log.createdAt,
        admin: {
          id: String(log.admin?._id || ""),
          email: log.admin?.email || "",
          name: log.admin?.adminProfile?.name || ""
        },
        targetUser: log.targetUser
          ? {
              id: String(log.targetUser._id),
              email: log.targetUser.email,
              userType: log.targetUser.userType,
              displayName:
                log.targetUser.userType === "company"
                  ? log.targetUser.companyProfile?.companyName || "Company"
                  : log.targetUser.seekerProfile?.name || "User"
            }
          : null,
        targetJob: log.targetJob
          ? {
              id: String(log.targetJob._id),
              title: log.targetJob.title
            }
          : null,
        targetMessage: log.targetMessage
          ? {
              id: String(log.targetMessage._id),
              text: log.targetMessage.text || ""
            }
          : null,
        metadata: log.metadata || {}
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load audit logs" });
  }
};
