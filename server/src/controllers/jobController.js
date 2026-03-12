import Job from "../models/Job.js";
import Swipe from "../models/Swipe.js";
import User from "../models/User.js";
import { isValidJobIndustry } from "../utils/jobIndustries.js";
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

    const job = await Job.create({
      company: req.user._id,
      title,
      description,
      salary: salary || "",
      industry,
      location,
      postcode: postcodeLocation.postcode,
      coordinates: postcodeLocation.coordinates,
      requiredSkills: parseSkills(requiredSkills)
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { jobListings: job._id }
    });

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
    if (isActive !== undefined) job.isActive = Boolean(isActive);

    await job.save();

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
