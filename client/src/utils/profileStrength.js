const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const hasAtLeastItems = (items, count) => Array.isArray(items) && items.filter(Boolean).length >= count;

const buildSeekerChecks = (seekerProfile, pendingFiles = {}) => [
  { key: "name", label: "Add your full name", done: isNonEmptyString(seekerProfile?.name) },
  { key: "bio", label: "Write a short bio", done: isNonEmptyString(seekerProfile?.bio) },
  {
    key: "skills",
    label: "Add at least 3 skills",
    done: hasAtLeastItems(seekerProfile?.skills, 3)
  },
  {
    key: "industryField",
    label: "Set your industry or field",
    done: isNonEmptyString(seekerProfile?.industryField || seekerProfile?.experience)
  },
  {
    key: "location",
    label: "Set your preferred location",
    done: isNonEmptyString(seekerProfile?.location)
  },
  {
    key: "profilePicture",
    label: "Upload a profile picture",
    done: Boolean(pendingFiles.profilePicture) || isNonEmptyString(seekerProfile?.profilePicture)
  },
  {
    key: "cvUrl",
    label: "Upload your CV",
    done: Boolean(pendingFiles.cv) || isNonEmptyString(seekerProfile?.cvUrl)
  }
];

const buildCompanyChecks = (companyProfile, jobsCount = 0, pendingFiles = {}) => [
  {
    key: "companyName",
    label: "Set your company name",
    done: isNonEmptyString(companyProfile?.companyName)
  },
  {
    key: "description",
    label: "Add a company description",
    done: isNonEmptyString(companyProfile?.description)
  },
  {
    key: "industry",
    label: "Choose your industry",
    done: isNonEmptyString(companyProfile?.industry)
  },
  {
    key: "logo",
    label: "Upload your company logo",
    done: Boolean(pendingFiles.logo) || isNonEmptyString(companyProfile?.logo)
  },
  {
    key: "jobsCount",
    label: "Publish at least one job listing",
    done: Number(jobsCount) > 0
  }
];

export const calculateProfileStrength = ({
  userType,
  seekerProfile,
  companyProfile,
  jobsCount = 0,
  pendingFiles = {}
}) => {
  const checks =
    userType === "company"
      ? buildCompanyChecks(companyProfile, jobsCount, pendingFiles)
      : buildSeekerChecks(seekerProfile, pendingFiles);

  const completed = checks.filter((check) => check.done).length;
  const total = checks.length;
  const score = total ? Math.round((completed / total) * 100) : 0;
  const nextActions = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    score,
    completed,
    total,
    nextActions
  };
};
