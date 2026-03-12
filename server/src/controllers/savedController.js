import Job from "../models/Job.js";
import SavedItem from "../models/SavedItem.js";
import User from "../models/User.js";

const getJobPopulate = () => ({
  path: "targetJob",
  select: "title description salary industry location postcode requiredSkills isActive company",
  populate: {
    path: "company",
    select: "companyProfile.companyName companyProfile.logo companyProfile.industry"
  }
});

const getCandidatePopulate = () => ({
  path: "targetUser",
  select: "userType seekerProfile"
});

export const getMySavedItems = async (req, res) => {
  try {
    if (req.user.userType === "seeker") {
      const savedJobs = await SavedItem.find({
        user: req.user._id,
        targetType: "job"
      })
        .populate(getJobPopulate())
        .sort({ createdAt: -1 });

      return res.json({ savedJobs, savedCandidates: [] });
    }

    const savedCandidates = await SavedItem.find({
      user: req.user._id,
      targetType: "candidate"
    })
      .populate(getJobPopulate())
      .populate(getCandidatePopulate())
      .sort({ createdAt: -1 });

    return res.json({ savedJobs: [], savedCandidates });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load saved items" });
  }
};

export const saveJob = async (req, res) => {
  try {
    if (req.user.userType !== "seeker") {
      return res.status(403).json({ message: "Only job seekers can save jobs" });
    }

    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job || !job.isActive) {
      return res.status(404).json({ message: "Job not found" });
    }

    const savedItem = await SavedItem.findOneAndUpdate(
      {
        user: req.user._id,
        targetType: "job",
        targetJob: job._id,
        targetUser: null
      },
      {
        user: req.user._id,
        targetType: "job",
        targetJob: job._id,
        targetUser: null
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).populate(getJobPopulate());

    return res.status(201).json(savedItem);
  } catch (error) {
    return res.status(500).json({ message: "Failed to save job" });
  }
};

export const saveCandidate = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can save candidates" });
    }

    const { candidateId } = req.params;
    const { jobId } = req.body;

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

    const savedItem = await SavedItem.findOneAndUpdate(
      {
        user: req.user._id,
        targetType: "candidate",
        targetJob: job._id,
        targetUser: candidate._id
      },
      {
        user: req.user._id,
        targetType: "candidate",
        targetJob: job._id,
        targetUser: candidate._id
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    )
      .populate(getJobPopulate())
      .populate(getCandidatePopulate());

    return res.status(201).json(savedItem);
  } catch (error) {
    return res.status(500).json({ message: "Failed to save candidate" });
  }
};

export const removeSavedItem = async (req, res) => {
  try {
    const { savedItemId } = req.params;

    const savedItem = await SavedItem.findOneAndDelete({
      _id: savedItemId,
      user: req.user._id
    });

    if (!savedItem) {
      return res.status(404).json({ message: "Saved item not found" });
    }

    return res.json({ message: "Saved item removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove saved item" });
  }
};
