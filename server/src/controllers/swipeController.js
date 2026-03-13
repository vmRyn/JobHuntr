import Job from "../models/Job.js";
import Match from "../models/Match.js";
import SavedItem from "../models/SavedItem.js";
import Swipe from "../models/Swipe.js";
import User from "../models/User.js";
import { notifyUser } from "../utils/notifications.js";
import {
  canManagePipeline,
  getCompanyAccountId,
  getCompanyRole
} from "../utils/companyAccess.js";

const createOrGetMatch = async (jobId, seekerId, companyId) => {
  const match = await Match.findOneAndUpdate(
    {
      job: jobId,
      seeker: seekerId,
      company: companyId
    },
    {
      job: jobId,
      seeker: seekerId,
      company: companyId
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return Match.findById(match._id)
    .populate("job", "title industry location postcode salary requiredSkills")
    .populate("seeker", "userType seekerProfile")
    .populate("company", "userType companyProfile");
};

export const swipeJob = async (req, res) => {
  try {
    if (req.user.userType !== "seeker") {
      return res.status(403).json({ message: "Only job seekers can swipe jobs" });
    }

    const { direction } = req.body;
    const { jobId } = req.params;

    if (!["left", "right"].includes(direction)) {
      return res.status(400).json({ message: "direction must be left or right" });
    }

    const job = await Job.findById(jobId);
    if (!job || !job.isActive) {
      return res.status(404).json({ message: "Job not found" });
    }

    await SavedItem.findOneAndDelete({
      user: req.user._id,
      targetType: "job",
      targetJob: job._id,
      targetUser: null
    });

    const swipe = await Swipe.findOneAndUpdate(
      {
        swiper: req.user._id,
        targetType: "job",
        targetJob: job._id,
        targetUser: null
      },
      {
        swiper: req.user._id,
        targetType: "job",
        targetJob: job._id,
        targetUser: null,
        direction
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    let match = null;

    if (direction === "right") {
      const companySwipe = await Swipe.findOne({
        swiper: job.company,
        targetType: "candidate",
        targetJob: job._id,
        targetUser: req.user._id,
        direction: "right"
      });

      if (companySwipe) {
        match = await createOrGetMatch(job._id, req.user._id, job.company);

        const companyName =
          match?.company?.companyProfile?.companyName ||
          "Company";

        await Promise.all([
          notifyUser({
            userId: req.user._id,
            type: "match_created",
            title: "New Match",
            message: `You matched with ${companyName} for ${match?.job?.title || "a role"}.`,
            metadata: {
              matchId: match?._id,
              jobId: match?.job?._id,
              jobTitle: match?.job?.title || "",
              companyId: match?.company?._id,
              companyName
            }
          }),
          notifyUser({
            userId: match?.company?._id || job.company,
            type: "match_created",
            title: "New Match",
            message: `${match?.seeker?.seekerProfile?.name || "A candidate"} matched for ${match?.job?.title || "a role"}.`,
            metadata: {
              matchId: match?._id,
              jobId: match?.job?._id,
              jobTitle: match?.job?.title || "",
              companyId: match?.company?._id,
              companyName
            }
          })
        ]);
      }
    }

    return res.json({
      swipe,
      matched: Boolean(match),
      match
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit swipe" });
  }
};

export const swipeCandidate = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can swipe candidates" });
    }

    const role = getCompanyRole(req.user);
    if (!canManagePipeline(role)) {
      return res.status(403).json({ message: "Only owners and recruiters can swipe candidates" });
    }

    const companyId = getCompanyAccountId(req.user);

    const { candidateId } = req.params;
    const { direction, jobId } = req.body;

    if (!["left", "right"].includes(direction)) {
      return res.status(400).json({ message: "direction must be left or right" });
    }

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    const job = await Job.findOne({ _id: jobId, company: companyId, isActive: true });
    if (!job) {
      return res.status(404).json({ message: "Job not found for company" });
    }

    const candidate = await User.findOne({ _id: candidateId, userType: "seeker" });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await SavedItem.findOneAndDelete({
      user: req.user._id,
      targetType: "candidate",
      targetJob: job._id,
      targetUser: candidate._id
    });

    const swipe = await Swipe.findOneAndUpdate(
      {
        swiper: companyId,
        targetType: "candidate",
        targetJob: job._id,
        targetUser: candidate._id
      },
      {
        swiper: companyId,
        targetType: "candidate",
        targetJob: job._id,
        targetUser: candidate._id,
        direction
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    let match = null;

    if (direction === "right") {
      const seekerSwipe = await Swipe.findOne({
        swiper: candidate._id,
        targetType: "job",
        targetJob: job._id,
        direction: "right"
      });

      if (seekerSwipe) {
        match = await createOrGetMatch(job._id, candidate._id, companyId);

        const companyName =
          match?.company?.companyProfile?.companyName ||
          req.user.companyProfile?.companyName ||
          "Company";

        await Promise.all([
          notifyUser({
            userId: candidate._id,
            type: "match_created",
            title: "New Match",
            message: `You matched with ${companyName} for ${job.title}.`,
            metadata: {
              matchId: match?._id,
              jobId: job._id,
              jobTitle: job.title,
              companyId,
              companyName
            }
          }),
          notifyUser({
            userId: companyId,
            type: "match_created",
            title: "New Match",
            message: `${candidate.seekerProfile?.name || "A candidate"} matched for ${job.title}.`,
            metadata: {
              matchId: match?._id,
              jobId: job._id,
              jobTitle: job.title,
              companyId,
              companyName
            }
          })
        ]);
      }
    }

    return res.json({
      swipe,
      matched: Boolean(match),
      match
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit swipe" });
  }
};
