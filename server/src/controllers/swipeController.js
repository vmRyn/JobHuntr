import Job from "../models/Job.js";
import Match from "../models/Match.js";
import Swipe from "../models/Swipe.js";
import User from "../models/User.js";

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
    .populate("job", "title location salary requiredSkills")
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

    const { candidateId } = req.params;
    const { direction, jobId } = req.body;

    if (!["left", "right"].includes(direction)) {
      return res.status(400).json({ message: "direction must be left or right" });
    }

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    const job = await Job.findOne({ _id: jobId, company: req.user._id, isActive: true });
    if (!job) {
      return res.status(404).json({ message: "Job not found for company" });
    }

    const candidate = await User.findOne({ _id: candidateId, userType: "seeker" });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const swipe = await Swipe.findOneAndUpdate(
      {
        swiper: req.user._id,
        targetType: "candidate",
        targetJob: job._id,
        targetUser: candidate._id
      },
      {
        swiper: req.user._id,
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
        match = await createOrGetMatch(job._id, candidate._id, req.user._id);
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
