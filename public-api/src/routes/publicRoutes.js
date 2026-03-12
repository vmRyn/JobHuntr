import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { toPublicCompany, toPublicJob } from "../utils/serializers.js";

const router = express.Router();

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

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/jobs", async (req, res, next) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const sort = req.query.sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const filters = {
      isActive: true
    };

    if (req.query.industry) {
      filters.industry = new RegExp(`^${escapeRegExp(String(req.query.industry).trim())}$`, "i");
    }

    if (req.query.location) {
      filters.location = new RegExp(escapeRegExp(String(req.query.location).trim()), "i");
    }

    if (req.query.companyId && mongoose.Types.ObjectId.isValid(String(req.query.companyId))) {
      filters.company = String(req.query.companyId);
    }

    const queryText = String(req.query.q || "").trim();

    if (queryText) {
      const queryRegex = new RegExp(escapeRegExp(queryText), "i");
      const matchingCompanies = await User.find(
        {
          userType: "company",
          "companyProfile.companyName": queryRegex
        },
        { _id: 1 }
      )
        .lean()
        .limit(250);

      const matchingCompanyIds = matchingCompanies.map((company) => company._id);

      filters.$or = [
        { title: queryRegex },
        { description: queryRegex },
        { requiredSkills: queryRegex },
        { company: { $in: matchingCompanyIds } }
      ];
    }

    const [total, jobs] = await Promise.all([
      Job.countDocuments(filters),
      Job.find(filters)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("company", "companyProfile")
        .lean()
    ]);

    res.json({
      data: jobs.map((job) => toPublicJob(job)).filter(Boolean),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/jobs/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job id" });
    }

    const job = await Job.findOne({ _id: id, isActive: true })
      .populate("company", "companyProfile")
      .lean();

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.json({ data: toPublicJob(job) });
  } catch (error) {
    return next(error);
  }
});

router.get("/companies", async (req, res, next) => {
  try {
    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);

    const activeCompanyIds = await Job.distinct("company", { isActive: true });

    const filters = {
      _id: { $in: activeCompanyIds },
      userType: "company"
    };

    const queryText = String(req.query.q || "").trim();

    if (req.query.industry) {
      filters["companyProfile.industry"] = new RegExp(
        `^${escapeRegExp(String(req.query.industry).trim())}$`,
        "i"
      );
    }

    if (queryText) {
      const queryRegex = new RegExp(escapeRegExp(queryText), "i");
      filters.$or = [
        { "companyProfile.companyName": queryRegex },
        { "companyProfile.description": queryRegex },
        { "companyProfile.industry": queryRegex }
      ];
    }

    const [total, companies] = await Promise.all([
      User.countDocuments(filters),
      User.find(filters)
        .sort({ "companyProfile.companyName": 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const companyIds = companies.map((company) => company._id);
    const counts = await Job.aggregate([
      { $match: { isActive: true, company: { $in: companyIds } } },
      { $group: { _id: "$company", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

    res.json({
      data: companies
        .map((company) => toPublicCompany(company, countMap.get(String(company._id)) || 0))
        .filter(Boolean),
      pagination: buildPagination(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const [activeJobs, companiesWithActiveJobs, industryBreakdown] = await Promise.all([
      Job.countDocuments({ isActive: true }),
      Job.distinct("company", { isActive: true }),
      Job.aggregate([
        {
          $match: {
            isActive: true,
            industry: { $exists: true, $ne: "" }
          }
        },
        {
          $group: {
            _id: "$industry",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      data: {
        activeJobs,
        companiesWithActiveJobs: companiesWithActiveJobs.length,
        topIndustries: industryBreakdown.map((entry) => ({
          industry: entry._id,
          jobCount: entry.count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
