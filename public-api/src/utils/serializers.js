const toPublicCompany = (company, activeJobCount = null) => {
  if (!company) {
    return null;
  }

  const profile = company.companyProfile || {};

  const payload = {
    id: String(company._id),
    name: profile.companyName || "Company",
    description: profile.description || "",
    industry: profile.industry || "",
    logo: profile.logo || ""
  };

  if (Number.isFinite(activeJobCount) && activeJobCount >= 0) {
    payload.activeJobCount = activeJobCount;
  }

  return payload;
};

const toPublicJob = (job) => {
  if (!job) {
    return null;
  }

  const company = toPublicCompany(job.company);

  return {
    id: String(job._id),
    title: job.title,
    description: job.description,
    salary: job.salary || "",
    industry: job.industry || "",
    location: job.location,
    postcode: job.postcode || "",
    requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills : [],
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    company
  };
};

export { toPublicCompany, toPublicJob };
