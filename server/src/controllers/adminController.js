import mongoose from "mongoose";
import AdminAuditLog from "../models/AdminAuditLog.js";
import Job from "../models/Job.js";
import Match from "../models/Match.js";
import User from "../models/User.js";

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

const addAuditLog = async ({ adminId, actionType, targetUser, targetJob, metadata = {} }) => {
  await AdminAuditLog.create({
    admin: adminId,
    actionType,
    targetUser: targetUser || null,
    targetJob: targetJob || null,
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
      totalMatches
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
      Match.countDocuments()
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
        totalMatches
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

export const getAuditLogs = async (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 30, 100);

    const logs = await AdminAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("admin", "email adminProfile.name")
      .populate("targetUser", "email userType companyProfile.companyName seekerProfile.name")
      .populate("targetJob", "title")
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
        metadata: log.metadata || {}
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load audit logs" });
  }
};
