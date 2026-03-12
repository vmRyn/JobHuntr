import Job from "../models/Job.js";
import Report from "../models/Report.js";
import Swipe from "../models/Swipe.js";
import User from "../models/User.js";
import { isValidJobIndustry } from "../utils/jobIndustries.js";
import {
  analyzeJobQuality,
  detectPotentialDuplicateJob,
  evaluateCompanyRiskSignals
} from "../utils/moderationSignals.js";
import {
  geocodePostcode,
  normalizePostcode,
  radiusToMeters
} from "../utils/postcodeGeocoding.js";

const parseSkills = (skills) => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    const trimmed = skills.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsedSkills = JSON.parse(trimmed);
        if (Array.isArray(parsedSkills)) {
          return parsedSkills.map((skill) => skill.trim()).filter(Boolean);
        }
      } catch (error) {
        // Fall back to comma-separated parsing.
      }
    }

    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const evaluateCompanyProfileQuality = (companyProfile = {}) => {
  let score = 0;

  if ((companyProfile.companyName || "").trim().length >= 2) {
    score += 35;
  }

  const descriptionLength = (companyProfile.description || "").trim().length;
  if (descriptionLength >= 220) {
    score += 45;
  } else if (descriptionLength >= 120) {
    score += 32;
  } else if (descriptionLength >= 60) {
    score += 18;
  }

  if ((companyProfile.industry || "").trim()) {
    score += 20;
  }

  return Math.min(100, score);
};

const buildJobModerationDecision = ({
  quality,
  risk,
  duplicateJob,
  previousFlags = []
}) => {
  const flags = [...new Set([...previousFlags, ...(quality.flags || []), ...(risk.signals || [])])];

  if (duplicateJob) {
    flags.push("possible_duplicate");
  }

  const normalizedFlags = [...new Set(flags)];

  const requiresManualReview =
    Boolean(duplicateJob) ||
    quality.qualityScore < 45 ||
    risk.highRisk ||
    normalizedFlags.includes("misleading_language") ||
    normalizedFlags.includes("high_posting_velocity");

  return {
    flags: normalizedFlags,
    qualityScore: quality.qualityScore,
    requiresManualReview,
    status: requiresManualReview ? "pending_review" : "approved",
    duplicateOf: duplicateJob?._id || null,
    notes: requiresManualReview
      ? "Pending admin review due to automated moderation signals"
      : ""
  };
};

const resolvePostcodeCoordinates = async (postcode) => {
  const normalizedPostcode = normalizePostcode(postcode);

  if (!normalizedPostcode) {
    return { error: "Postcode is required" };
  }

  try {
    const location = await geocodePostcode(normalizedPostcode);

    if (!location) {
      return { error: "We could not find that postcode. Try a nearby central postcode." };
    }

    return {
      postcode: normalizedPostcode,
      coordinates: {
        type: "Point",
        coordinates: [location.lng, location.lat]
      }
    };
  } catch (error) {
    return {
      error: "Postcode lookup is unavailable right now. Please try again in a moment."
    };
  }
};

export const getJobsFeed = async (req, res) => {
  try {
    if (req.user.userType !== "seeker") {
      return res.status(403).json({ message: "Only job seekers can access this feed" });
    }

    const previousSwipes = await Swipe.find({
      swiper: req.user._id,
      targetType: "job"
    }).select("targetJob");

    const swipedJobIds = previousSwipes.map((swipe) => swipe.targetJob).filter(Boolean);

    const { postcode, radius, radiusUnit, industry } = req.query;

    const jobQuery = {
      isActive: true,
      "moderation.status": "approved",
      _id: { $nin: swipedJobIds }
    };

    if (industry) {
      jobQuery.industry = industry;
    }

    if (postcode?.trim()) {
      const postcodeLocation = await resolvePostcodeCoordinates(postcode);

      if (postcodeLocation.error) {
        return res.status(400).json({ message: postcodeLocation.error });
      }

      jobQuery.coordinates = {
        $nearSphere: {
          $geometry: postcodeLocation.coordinates,
          $maxDistance: radiusToMeters(radius, radiusUnit)
        }
      };
    }

    let jobQueryBuilder = Job.find(jobQuery)
      .populate(
        "company",
        "companyProfile.companyName companyProfile.logo companyProfile.industry companyProfile.isVerified"
      )
      .limit(50);

    if (!postcode?.trim()) {
      jobQueryBuilder = jobQueryBuilder.sort({ createdAt: -1 });
    }

    const jobs = await jobQueryBuilder;

    return res.json(jobs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load jobs" });
  }
};

export const getCompanyJobs = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can access this route" });
    }

    const jobs = await Job.find({ company: req.user._id }).sort({ createdAt: -1 });
    return res.json(jobs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load jobs" });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "company",
      "companyProfile.companyName companyProfile.logo companyProfile.industry companyProfile.isVerified"
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (
      req.user.userType === "seeker" &&
      (!job.isActive || job.moderation?.status !== "approved")
    ) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (req.user.userType === "company" && String(job.company?._id || job.company) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(job);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load job" });
  }
};

export const createJob = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can create jobs" });
    }

    const { title, description, salary, location, postcode, requiredSkills, industry } = req.body;

    if (!title || !description || !location || !postcode || !industry) {
      return res
        .status(400)
        .json({ message: "title, description, location, postcode, and industry are required" });
    }

    if (!isValidJobIndustry(industry)) {
      return res.status(400).json({ message: "Please choose a valid job industry" });
    }

    const postcodeLocation = await resolvePostcodeCoordinates(postcode);

    if (postcodeLocation.error) {
      return res.status(400).json({ message: postcodeLocation.error });
    }

    const parsedRequiredSkills = parseSkills(requiredSkills);
    const company = await User.findById(req.user._id).select("companyProfile createdAt moderation");
    const jobsCreatedLast24h = await Job.countDocuments({
      company: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const existingJobs = await Job.find({
      company: req.user._id,
      title: new RegExp(`^${escapeRegExp(title.trim())}$`, "i")
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const quality = analyzeJobQuality({
      title,
      description,
      requiredSkills: parsedRequiredSkills,
      industry,
      location
    });

    const companyRisk = evaluateCompanyRiskSignals({
      company,
      jobsCreatedLast24h,
      profileQualityScore: evaluateCompanyProfileQuality(company?.companyProfile)
    });

    const duplicateJob = detectPotentialDuplicateJob({
      jobInput: {
        title,
        location,
        postcode: postcodeLocation.postcode
      },
      existingJobs
    });

    const moderationDecision = buildJobModerationDecision({
      quality,
      risk: companyRisk,
      duplicateJob
    });

    const job = await Job.create({
      company: req.user._id,
      title,
      description,
      salary: salary || "",
      industry,
      location,
      postcode: postcodeLocation.postcode,
      coordinates: postcodeLocation.coordinates,
      requiredSkills: parsedRequiredSkills,
      isActive: moderationDecision.requiresManualReview ? false : true,
      moderation: {
        status: moderationDecision.status,
        qualityScore: moderationDecision.qualityScore,
        flags: moderationDecision.flags,
        duplicateOf: moderationDecision.duplicateOf,
        notes: moderationDecision.notes
      }
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { jobListings: job._id }
    });

    if (companyRisk.riskScore > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          "moderation.suspiciousCompanyScore": Math.max(1, Math.round(companyRisk.riskScore / 5))
        },
        $addToSet: {
          "moderation.riskSignals": {
            $each: companyRisk.signals
          }
        }
      });
    }

    if (moderationDecision.requiresManualReview) {
      await Report.create({
        sourceType: "automation",
        targetType: "job",
        targetJob: job._id,
        targetUser: req.user._id,
        reasonCategory: duplicateJob
          ? "duplicate"
          : moderationDecision.flags.includes("misleading_language")
            ? "misleading_job"
            : "other",
        details: `Automated job moderation triggered. Score ${moderationDecision.qualityScore}.`,
        priority:
          moderationDecision.flags.includes("misleading_language") || companyRisk.riskScore >= 65
            ? "high"
            : "medium",
        automationSignals: moderationDecision.flags
      });
    }

    if (companyRisk.highRisk) {
      await Report.create({
        sourceType: "automation",
        targetType: "company",
        targetUser: req.user._id,
        reasonCategory: "other",
        details: "Automated company risk alert triggered due to posting behavior and profile quality.",
        priority: companyRisk.riskScore >= 70 ? "critical" : "high",
        automationSignals: companyRisk.signals
      });
    }

    return res.status(201).json(job);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create job" });
  }
};

export const updateJob = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can update jobs" });
    }

    const job = await Job.findOne({ _id: req.params.id, company: req.user._id });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const { title, description, salary, location, postcode, requiredSkills, isActive, industry } =
      req.body;

    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (salary !== undefined) job.salary = salary;
    if (location !== undefined) job.location = location;
    if (industry !== undefined) {
      if (!isValidJobIndustry(industry)) {
        return res.status(400).json({ message: "Please choose a valid job industry" });
      }

      job.industry = industry;
    }

    if (postcode !== undefined) {
      const postcodeLocation = await resolvePostcodeCoordinates(postcode);

      if (postcodeLocation.error) {
        return res.status(400).json({ message: postcodeLocation.error });
      }

      job.postcode = postcodeLocation.postcode;
      job.coordinates = postcodeLocation.coordinates;
    }

    if (requiredSkills !== undefined) job.requiredSkills = parseSkills(requiredSkills);

    const company = await User.findById(req.user._id).select("companyProfile createdAt moderation");
    const jobsCreatedLast24h = await Job.countDocuments({
      company: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const quality = analyzeJobQuality({
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills,
      industry: job.industry,
      location: job.location
    });

    const companyRisk = evaluateCompanyRiskSignals({
      company,
      jobsCreatedLast24h,
      profileQualityScore: evaluateCompanyProfileQuality(company?.companyProfile)
    });

    const existingJobs = await Job.find({
      company: req.user._id,
      _id: { $ne: job._id },
      title: new RegExp(`^${escapeRegExp(job.title.trim())}$`, "i")
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const duplicateJob = detectPotentialDuplicateJob({
      jobInput: {
        title: job.title,
        location: job.location,
        postcode: job.postcode
      },
      existingJobs
    });

    const moderationDecision = buildJobModerationDecision({
      quality,
      risk: companyRisk,
      duplicateJob,
      previousFlags: job.moderation?.flags || []
    });

    job.moderation = {
      ...(job.moderation || {}),
      status: moderationDecision.status,
      qualityScore: moderationDecision.qualityScore,
      flags: moderationDecision.flags,
      duplicateOf: moderationDecision.duplicateOf,
      notes: moderationDecision.notes,
      reviewedBy: moderationDecision.requiresManualReview ? null : job.moderation?.reviewedBy || null,
      reviewedAt: moderationDecision.requiresManualReview ? null : job.moderation?.reviewedAt || null
    };

    if (isActive !== undefined && !moderationDecision.requiresManualReview) {
      job.isActive = Boolean(isActive);
    }

    if (moderationDecision.requiresManualReview) {
      job.isActive = false;
    }

    await job.save();

    if (moderationDecision.requiresManualReview) {
      await Report.create({
        sourceType: "automation",
        targetType: "job",
        targetJob: job._id,
        targetUser: req.user._id,
        reasonCategory: duplicateJob
          ? "duplicate"
          : moderationDecision.flags.includes("misleading_language")
            ? "misleading_job"
            : "other",
        details: `Automated moderation triggered on job update. Score ${moderationDecision.qualityScore}.`,
        priority:
          moderationDecision.flags.includes("misleading_language") || companyRisk.riskScore >= 65
            ? "high"
            : "medium",
        automationSignals: moderationDecision.flags
      });
    }

    if (companyRisk.highRisk) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          "moderation.suspiciousCompanyScore": Math.max(1, Math.round(companyRisk.riskScore / 5))
        },
        $addToSet: {
          "moderation.riskSignals": {
            $each: companyRisk.signals
          }
        }
      });

      await Report.create({
        sourceType: "automation",
        targetType: "company",
        targetUser: req.user._id,
        reasonCategory: "other",
        details: "Automated company risk alert triggered on job update.",
        priority: companyRisk.riskScore >= 70 ? "critical" : "high",
        automationSignals: companyRisk.signals
      });
    }

    return res.json(job);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update job" });
  }
};

export const deleteJob = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can delete jobs" });
    }

    const job = await Job.findOneAndDelete({ _id: req.params.id, company: req.user._id });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { jobListings: job._id }
    });

    return res.json({ message: "Job deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete job" });
  }
};
