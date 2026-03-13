import User from "../models/User.js";
import Swipe from "../models/Swipe.js";
import { toPublicUploadPath } from "../middleware/upload.js";
import { attachProfileCompletion } from "../utils/profileCompletion.js";
import {
  canManageProfile,
  canViewCompanyData,
  getCompanyAccountId,
  getCompanyRole
} from "../utils/companyAccess.js";

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
  return undefined;
};

const parseStringList = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      // Fall back to newline parsing.
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getUploadedFile = (files, fieldName) => files?.[fieldName]?.[0] || null;

const normalizeLinkedInUrl = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch (error) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLinkedInHost = /(^|\.)linkedin\.[a-z.]+$/i.test(hostname);

  if (!isLinkedInHost) {
    return null;
  }

  return parsed.toString();
};

export const getMyProfile = async (req, res) => {
  try {
    if (req.user.userType === "company") {
      const companyId = getCompanyAccountId(req.user);
      const role = getCompanyRole(req.user);

      if (!canViewCompanyData(role)) {
        return res.status(403).json({ message: "Insufficient company permissions" });
      }

      const [companyAccount, sessionUser] = await Promise.all([
        User.findById(companyId).select("-password").populate("jobListings"),
        User.findById(req.user._id).select("-password")
      ]);

      if (!companyAccount || !sessionUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const response = sessionUser.toObject();
      response.companyProfile = companyAccount.companyProfile || {};
      response.jobListings = companyAccount.jobListings || [];
      response.companyAccess = sessionUser.companyAccess || { role: "owner", companyAccount: null };

      return res.json(attachProfileCompletion(response));
    }

    const user = await User.findById(req.user._id).select("-password").populate("jobListings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(attachProfileCompletion(user));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const targetUserId =
      req.user.userType === "company" ? getCompanyAccountId(req.user) : req.user._id;

    const user = await User.findById(targetUserId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType === "seeker") {
      const { name, bio, skills, experience, industryField, location, profilePicture, linkedinUrl } = req.body;
      const portfolioUrl = req.body?.portfolioUrl;
      const projects = req.body?.projects;
      const education = req.body?.education;
      const certifications = req.body?.certifications;
      const workHistoryTimeline = req.body?.workHistoryTimeline;
      const uploadedProfilePicture = getUploadedFile(req.files, "profilePicture");
      const uploadedCv = getUploadedFile(req.files, "cv");

      if (name !== undefined) user.seekerProfile.name = name;
      if (bio !== undefined) user.seekerProfile.bio = bio;
      if (experience !== undefined) user.seekerProfile.experience = experience;
      if (industryField !== undefined || experience !== undefined) {
        user.seekerProfile.industryField = industryField ?? experience;
      }
      if (location !== undefined) user.seekerProfile.location = location;
      if (portfolioUrl !== undefined) user.seekerProfile.portfolioUrl = String(portfolioUrl || "").trim();
      if (linkedinUrl !== undefined) {
        const normalizedLinkedInUrl = normalizeLinkedInUrl(linkedinUrl);

        if (normalizedLinkedInUrl === null) {
          return res.status(400).json({ message: "Enter a valid LinkedIn URL" });
        }

        user.seekerProfile.linkedinUrl = normalizedLinkedInUrl;
      }
      if (profilePicture !== undefined && profilePicture.trim()) {
        user.seekerProfile.profilePicture = profilePicture;
      }
      if (uploadedProfilePicture) {
        user.seekerProfile.profilePicture = toPublicUploadPath(uploadedProfilePicture.path);
      }
      if (uploadedCv) {
        user.seekerProfile.cvUrl = toPublicUploadPath(uploadedCv.path);
        user.seekerProfile.cvOriginalName = uploadedCv.originalname;
      }

      const parsedSkills = parseSkills(skills);
      if (parsedSkills !== undefined) user.seekerProfile.skills = parsedSkills;

      const parsedProjects = parseStringList(projects);
      if (parsedProjects !== undefined) user.seekerProfile.projects = parsedProjects;

      const parsedEducation = parseStringList(education);
      if (parsedEducation !== undefined) user.seekerProfile.education = parsedEducation;

      const parsedCertifications = parseStringList(certifications);
      if (parsedCertifications !== undefined) {
        user.seekerProfile.certifications = parsedCertifications;
      }

      const parsedWorkHistory = parseStringList(workHistoryTimeline);
      if (parsedWorkHistory !== undefined) {
        user.seekerProfile.workHistoryTimeline = parsedWorkHistory;
      }
    }

    if (user.userType === "company") {
      const role = getCompanyRole(req.user);
      if (!canManageProfile(role)) {
        return res.status(403).json({ message: "Only company owners can update company profile" });
      }

      const { companyName, description, industry, logo, linkedinUrl, website, proofDocuments } = req.body;
      const uploadedLogo = getUploadedFile(req.files, "logo");

      if (companyName !== undefined) user.companyProfile.companyName = companyName;
      if (description !== undefined) user.companyProfile.description = description;
      if (industry !== undefined) user.companyProfile.industry = industry;
      if (website !== undefined) {
        user.companyProfile.website = String(website || "").trim();
      }
      if (linkedinUrl !== undefined) {
        const normalizedLinkedInUrl = normalizeLinkedInUrl(linkedinUrl);

        if (normalizedLinkedInUrl === null) {
          return res.status(400).json({ message: "Enter a valid LinkedIn URL" });
        }

        user.companyProfile.linkedinUrl = normalizedLinkedInUrl;
      }
      if (logo !== undefined && logo.trim()) user.companyProfile.logo = logo;
      if (uploadedLogo) {
        user.companyProfile.logo = toPublicUploadPath(uploadedLogo.path);
      }

      const parsedProofDocuments = parseStringList(proofDocuments);
      if (parsedProofDocuments !== undefined) {
        user.companyProfile.proofDocuments = parsedProofDocuments;
      }
    }

    await user.save();

    const [safeUser, sessionUser] = await Promise.all([
      User.findById(user._id).select("-password").populate("jobListings"),
      User.findById(req.user._id).select("-password")
    ]);

    if (sessionUser?.userType === "company" && safeUser?._id?.toString() !== sessionUser._id.toString()) {
      const response = sessionUser.toObject();
      response.companyProfile = safeUser.companyProfile || {};
      response.jobListings = safeUser.jobListings || [];

      return res.json(attachProfileCompletion(response));
    }

    return res.json(attachProfileCompletion(safeUser));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export const getCandidates = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can access candidates" });
    }

    const role = getCompanyRole(req.user);
    if (!canViewCompanyData(role)) {
      return res.status(403).json({ message: "Insufficient company permissions" });
    }

    const companyId = getCompanyAccountId(req.user);

    const { jobId } = req.query;

    let swipedCandidateIds = [];
    if (jobId) {
      const existingSwipes = await Swipe.find({
        swiper: companyId,
        targetType: "candidate",
        targetJob: jobId
      }).select("targetUser");

      swipedCandidateIds = existingSwipes
        .map((swipe) => swipe.targetUser)
        .filter(Boolean);
    }

    const idQuery = { $ne: req.user._id };
    if (swipedCandidateIds.length > 0) {
      idQuery.$nin = swipedCandidateIds;
    }

    const candidates = await User.find({
      userType: "seeker",
      _id: idQuery
    })
      .select("-password -email")
      .limit(50)
      .sort({ updatedAt: -1 });

    return res.json(candidates);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load candidates" });
  }
};
