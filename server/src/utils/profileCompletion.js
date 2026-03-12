const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const hasMinSkills = (skills, minimum = 3) =>
  Array.isArray(skills) && skills.filter((skill) => isNonEmptyString(skill)).length >= minimum;

const seekerChecks = (profile = {}) => [
  {
    key: "name",
    label: "Add your full name",
    done: isNonEmptyString(profile.name)
  },
  {
    key: "bio",
    label: "Write a short bio",
    done: isNonEmptyString(profile.bio)
  },
  {
    key: "skills",
    label: "Add at least 3 skills",
    done: hasMinSkills(profile.skills, 3)
  },
  {
    key: "industryField",
    label: "Set your industry or field",
    done: isNonEmptyString(profile.industryField || profile.experience)
  },
  {
    key: "location",
    label: "Set your preferred location",
    done: isNonEmptyString(profile.location)
  },
  {
    key: "cvUrl",
    label: "Upload your CV",
    done: isNonEmptyString(profile.cvUrl)
  }
];

const companyChecks = (profile = {}) => [
  {
    key: "companyName",
    label: "Set your company name",
    done: isNonEmptyString(profile.companyName)
  },
  {
    key: "description",
    label: "Add a company description",
    done: isNonEmptyString(profile.description)
  },
  {
    key: "industry",
    label: "Choose your industry",
    done: isNonEmptyString(profile.industry)
  }
];

export const getProfileCompletionState = (user) => {
  if (!user) {
    return {
      profileCompleted: false,
      missingProfileFields: []
    };
  }

  if (user.userType === "admin") {
    return {
      profileCompleted: true,
      missingProfileFields: []
    };
  }

  const checks =
    user.userType === "company"
      ? companyChecks(user.companyProfile)
      : seekerChecks(user.seekerProfile);

  const missingProfileFields = checks
    .filter((check) => !check.done)
    .map(({ key, label }) => ({ key, label }));

  return {
    profileCompleted: missingProfileFields.length === 0,
    missingProfileFields
  };
};

export const attachProfileCompletion = (user) => {
  if (!user) {
    return user;
  }

  const plainUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
  return {
    ...plainUser,
    ...getProfileCompletionState(plainUser)
  };
};
