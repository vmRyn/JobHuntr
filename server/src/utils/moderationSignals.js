const FLAGGED_KEYWORDS = [
  "crypto",
  "bitcoin",
  "wallet",
  "wire transfer",
  "western union",
  "gift card",
  "pay upfront",
  "quick money",
  "easy money",
  "send bank details",
  "social security",
  "passport"
];

const SCAM_PATTERNS = [
  {
    id: "money_upfront",
    regex: /(pay\s+upfront|deposit\s+required|send\s+money\s+first)/i,
    score: 35
  },
  {
    id: "off_platform_payment",
    regex: /(wire\s+transfer|gift\s*card|crypto|bitcoin|usdt|western\s+union)/i,
    score: 40
  },
  {
    id: "credential_harvest",
    regex: /(send\s+bank\s+details|share\s+passport|social\s+security\s+number)/i,
    score: 45
  },
  {
    id: "too_good_to_be_true",
    regex: /(guaranteed\s+income|earn\s+\$?\d+\s+daily|no\s+experience\s+needed\s+high\s+pay)/i,
    score: 28
  },
  {
    id: "urgent_pressure",
    regex: /(urgent\s+response|immediate\s+action\s+required|limited\s+slots\s+today)/i,
    score: 18
  }
];

const LOW_QUALITY_JOB_TERMS = ["quick cash", "easy work", "no experience high pay", "instant hire"];

const normalizeText = (value) => String(value || "").trim();

const toRiskLevel = (score) => {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
};

export const analyzeMessageSafety = (messageText) => {
  const text = normalizeText(messageText);

  if (!text) {
    return {
      riskScore: 0,
      riskLevel: "low",
      flaggedKeywords: [],
      matchedPatterns: []
    };
  }

  const lowered = text.toLowerCase();
  const flaggedKeywords = FLAGGED_KEYWORDS.filter((keyword) => lowered.includes(keyword));

  let riskScore = Math.min(30, flaggedKeywords.length * 7);
  const matchedPatterns = [];

  for (const pattern of SCAM_PATTERNS) {
    if (pattern.regex.test(text)) {
      matchedPatterns.push(pattern.id);
      riskScore += pattern.score;
    }
  }

  const containsUrl = /(https?:\/\/|www\.)/i.test(text);
  if (containsUrl) {
    riskScore += 8;
  }

  if (text.length > 1000) {
    riskScore += 6;
  }

  riskScore = Math.min(100, riskScore);

  return {
    riskScore,
    riskLevel: toRiskLevel(riskScore),
    flaggedKeywords,
    matchedPatterns
  };
};

const scoreDescriptionQuality = (description = "") => {
  const trimmed = normalizeText(description);

  if (!trimmed) return 0;
  if (trimmed.length < 80) return 15;
  if (trimmed.length < 140) return 30;
  if (trimmed.length < 240) return 55;
  return 75;
};

const scoreSkillsQuality = (requiredSkills = []) => {
  const skills = Array.isArray(requiredSkills)
    ? requiredSkills.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  if (skills.length >= 5) return 25;
  if (skills.length >= 3) return 18;
  if (skills.length >= 1) return 8;
  return 0;
};

export const analyzeJobQuality = ({ title, description, requiredSkills = [], industry, location }) => {
  const flags = [];
  let qualityScore = 0;

  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);
  const normalizedIndustry = normalizeText(industry);
  const normalizedLocation = normalizeText(location);

  qualityScore += scoreDescriptionQuality(normalizedDescription);
  qualityScore += scoreSkillsQuality(requiredSkills);

  if (!normalizedTitle || normalizedTitle.length < 6) {
    flags.push("low_title_quality");
  }

  if (!normalizedDescription || normalizedDescription.length < 80) {
    flags.push("low_description_quality");
  }

  const loweredDescription = normalizedDescription.toLowerCase();
  if (LOW_QUALITY_JOB_TERMS.some((term) => loweredDescription.includes(term))) {
    flags.push("misleading_language");
    qualityScore -= 15;
  }

  if (!normalizedIndustry) {
    flags.push("missing_industry");
    qualityScore -= 10;
  }

  if (!normalizedLocation) {
    flags.push("missing_location");
    qualityScore -= 10;
  }

  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return {
    qualityScore,
    flags
  };
};

export const evaluateCompanyRiskSignals = ({ company, jobsCreatedLast24h = 0, profileQualityScore = 100 }) => {
  const now = Date.now();
  const createdAt = company?.createdAt ? new Date(company.createdAt).getTime() : now;
  const ageDays = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));

  const signals = [];
  let riskScore = 0;

  if (ageDays < 14) {
    signals.push("new_company_account");
    riskScore += 25;
  }

  if (jobsCreatedLast24h >= 4) {
    signals.push("high_posting_velocity");
    riskScore += 35;
  }

  if (profileQualityScore < 40) {
    signals.push("low_profile_quality");
    riskScore += 28;
  }

  if (!company?.companyProfile?.isVerified) {
    signals.push("unverified_company");
    riskScore += 12;
  }

  riskScore = Math.min(100, riskScore);

  return {
    riskScore,
    signals,
    highRisk: riskScore >= 45
  };
};

export const detectPotentialDuplicateJob = ({ jobInput, existingJobs = [] }) => {
  const normalizedTitle = normalizeText(jobInput?.title).toLowerCase();
  const normalizedLocation = normalizeText(jobInput?.location).toLowerCase();
  const normalizedPostcode = normalizeText(jobInput?.postcode).toLowerCase();

  const duplicate = existingJobs.find((job) => {
    const titleMatch = normalizeText(job.title).toLowerCase() === normalizedTitle;
    const locationMatch = normalizeText(job.location).toLowerCase() === normalizedLocation;
    const postcodeMatch = normalizeText(job.postcode).toLowerCase() === normalizedPostcode;

    if (!titleMatch) return false;
    if (normalizedPostcode && postcodeMatch) return true;
    return locationMatch;
  });

  return duplicate || null;
};
