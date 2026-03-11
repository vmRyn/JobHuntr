import User from "../models/User.js";
import Swipe from "../models/Swipe.js";
import { toPublicUploadPath } from "../middleware/upload.js";

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

const getUploadedFile = (files, fieldName) => files?.[fieldName]?.[0] || null;

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").populate("jobListings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType === "seeker") {
      const { name, bio, skills, experience, industryField, location, profilePicture } = req.body;
      const uploadedProfilePicture = getUploadedFile(req.files, "profilePicture");
      const uploadedCv = getUploadedFile(req.files, "cv");

      if (name !== undefined) user.seekerProfile.name = name;
      if (bio !== undefined) user.seekerProfile.bio = bio;
      if (experience !== undefined) user.seekerProfile.experience = experience;
      if (industryField !== undefined || experience !== undefined) {
        user.seekerProfile.industryField = industryField ?? experience;
      }
      if (location !== undefined) user.seekerProfile.location = location;
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
    }

    if (user.userType === "company") {
      const { companyName, description, industry, logo } = req.body;
      const uploadedLogo = getUploadedFile(req.files, "logo");

      if (companyName !== undefined) user.companyProfile.companyName = companyName;
      if (description !== undefined) user.companyProfile.description = description;
      if (industry !== undefined) user.companyProfile.industry = industry;
      if (logo !== undefined && logo.trim()) user.companyProfile.logo = logo;
      if (uploadedLogo) {
        user.companyProfile.logo = toPublicUploadPath(uploadedLogo.path);
      }
    }

    await user.save();

    const safeUser = await User.findById(user._id).select("-password").populate("jobListings");
    return res.json(safeUser);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export const getCandidates = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can access candidates" });
    }

    const { jobId } = req.query;

    let swipedCandidateIds = [];
    if (jobId) {
      const existingSwipes = await Swipe.find({
        swiper: req.user._id,
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
