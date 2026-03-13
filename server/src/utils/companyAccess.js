export const companyRoles = new Set(["owner", "recruiter", "viewer"]);

export const getCompanyRole = (user) => {
  const role = user?.companyAccess?.role;
  if (companyRoles.has(role)) {
    return role;
  }

  return "owner";
};

export const getCompanyAccountId = (user) => {
  if (!user) {
    return "";
  }

  const companyAccount = user.companyAccess?.companyAccount;
  if (companyAccount) {
    return companyAccount.toString();
  }

  return user._id?.toString?.() || "";
};

export const canManageJobs = (role) => role === "owner" || role === "recruiter";

export const canManageTeam = (role) => role === "owner";

export const canManageProfile = (role) => role === "owner";

export const canManagePipeline = (role) => role === "owner" || role === "recruiter";

export const canViewCompanyData = (role) => role === "owner" || role === "recruiter" || role === "viewer";
