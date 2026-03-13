import CompanyInvite from "../models/CompanyInvite.js";
import User from "../models/User.js";
import createToken from "../utils/createToken.js";
import { buildCompanyInviteEmail } from "../utils/emailTemplates.js";
import { sendTransactionalEmail } from "../utils/mailer.js";
import { attachProfileCompletion } from "../utils/profileCompletion.js";
import { canManageTeam, getCompanyAccountId, getCompanyRole } from "../utils/companyAccess.js";
import { expiresInMinutes, generateToken, hashToken } from "../utils/securityTokens.js";

const allowedInviteRoles = new Set(["recruiter", "viewer"]);
const isNonProduction = process.env.NODE_ENV !== "production";
const appName = String(process.env.APP_NAME || "JobHuntr").trim() || "JobHuntr";
const clientAppUrl = String(process.env.CLIENT_URL || "http://localhost:5173").trim();

const buildClientUrl = (path, query = {}) => {
  const safeBase = clientAppUrl || "http://localhost:5173";
  const normalizedBase = safeBase.endsWith("/") ? safeBase : `${safeBase}/`;
  const normalizedPath = String(path || "").replace(/^\/+/, "");

  const url = new URL(normalizedPath, normalizedBase);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      return;
    }

    url.searchParams.set(key, normalizedValue);
  });

  return url.toString();
};

const sendInviteEmail = async ({ to, message }) => {
  try {
    return await sendTransactionalEmail({
      to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
  } catch (error) {
    console.error("[email:company_invite] Failed to send invite email", error);
    return {
      delivered: false,
      reason: "send_failed"
    };
  }
};

const toInviteSummary = (invite) => ({
  id: String(invite._id),
  email: invite.email,
  role: invite.role,
  status: invite.status,
  invitedBy: invite.invitedBy || null,
  expiresAt: invite.expiresAt,
  createdAt: invite.createdAt,
  updatedAt: invite.updatedAt
});

const toTeamMemberSummary = (member, companyId) => {
  const isOwner = String(member._id) === String(companyId);

  return {
    id: String(member._id),
    email: member.email,
    role: isOwner ? "owner" : member.companyAccess?.role || "viewer",
    isOwner,
    createdAt: member.createdAt,
    displayName: member.companyProfile?.companyName || member.email
  };
};

const ensureCompanyOwner = (req, res) => {
  if (req.user.userType !== "company") {
    res.status(403).json({ message: "Company access required" });
    return false;
  }

  const role = getCompanyRole(req.user);
  if (!canManageTeam(role)) {
    res.status(403).json({ message: "Only company owners can manage team members" });
    return false;
  }

  return true;
};

export const listCompanyTeamMembers = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Company access required" });
    }

    const companyId = getCompanyAccountId(req.user);

    const members = await User.find({
      userType: "company",
      $or: [{ _id: companyId }, { "companyAccess.companyAccount": companyId }]
    })
      .select("email companyAccess companyProfile.companyName createdAt")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      members: members.map((member) => toTeamMemberSummary(member, companyId))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load team members" });
  }
};

export const listCompanyInvites = async (req, res) => {
  try {
    if (!ensureCompanyOwner(req, res)) {
      return;
    }

    const companyId = getCompanyAccountId(req.user);

    const invites = await CompanyInvite.find({
      companyAccount: companyId
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      invites: invites.map((invite) => toInviteSummary(invite))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load team invites" });
  }
};

export const createCompanyInvite = async (req, res) => {
  try {
    if (!ensureCompanyOwner(req, res)) {
      return;
    }

    const companyId = getCompanyAccountId(req.user);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const roleInput = String(req.body?.role || "viewer").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    if (!allowedInviteRoles.has(roleInput)) {
      return res.status(400).json({ message: "role must be recruiter or viewer" });
    }

    const existingMember = await User.findOne({
      email,
      userType: "company",
      $or: [{ _id: companyId }, { "companyAccess.companyAccount": companyId }]
    }).select("_id");

    if (existingMember) {
      return res.status(409).json({ message: "This email is already a team member" });
    }

    const token = generateToken(24);
    const tokenHash = hashToken(token);
    const expiresAt = expiresInMinutes(60 * 24 * 7);

    const invite = await CompanyInvite.findOneAndUpdate(
      {
        companyAccount: companyId,
        email,
        status: "pending"
      },
      {
        companyAccount: companyId,
        invitedBy: req.user._id,
        email,
        role: roleInput,
        tokenHash,
        status: "pending",
        expiresAt,
        acceptedBy: null,
        acceptedAt: null
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const companyName = req.user.companyProfile?.companyName || "Your company";
    const inviteUrl = buildClientUrl("accept-company-invite", { token });
    await sendInviteEmail({
      to: email,
      message: buildCompanyInviteEmail({
        appName,
        inviteUrl,
        companyName,
        role: roleInput,
        expiresAt
      })
    });

    return res.status(201).json({
      invite: toInviteSummary(invite),
      ...(isNonProduction
        ? {
            invitePreviewToken: token
          }
        : {})
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create team invite" });
  }
};

export const revokeCompanyInvite = async (req, res) => {
  try {
    if (!ensureCompanyOwner(req, res)) {
      return;
    }

    const companyId = getCompanyAccountId(req.user);

    const invite = await CompanyInvite.findOneAndUpdate(
      {
        _id: req.params.inviteId,
        companyAccount: companyId,
        status: "pending"
      },
      {
        status: "revoked"
      },
      { new: true }
    );

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    return res.json({
      invite: toInviteSummary(invite)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to revoke invite" });
  }
};

export const acceptCompanyInvite = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "").trim();

    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }

    const invite = await CompanyInvite.findOne({
      tokenHash: hashToken(token),
      status: "pending"
    }).select("+tokenHash");

    if (!invite) {
      return res.status(400).json({ message: "Invite is invalid" });
    }

    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      invite.status = "expired";
      await invite.save();
      return res.status(400).json({ message: "Invite has expired" });
    }

    const existingUser = await User.findOne({ email: invite.email }).select("_id");
    if (existingUser) {
      return res.status(409).json({ message: "An account already exists with this email" });
    }

    const companyAccount = await User.findById(invite.companyAccount)
      .select("companyProfile")
      .lean();

    if (!companyAccount) {
      return res.status(404).json({ message: "Company account not found" });
    }

    const user = await User.create({
      userType: "company",
      email: invite.email,
      password,
      companyProfile: {
        companyName: companyAccount.companyProfile?.companyName || "",
        description: companyAccount.companyProfile?.description || "",
        industry: companyAccount.companyProfile?.industry || "",
        website: companyAccount.companyProfile?.website || "",
        proofDocuments: companyAccount.companyProfile?.proofDocuments || [],
        linkedinUrl: companyAccount.companyProfile?.linkedinUrl || "",
        logo: companyAccount.companyProfile?.logo || "",
        isVerified: companyAccount.companyProfile?.isVerified || false,
        verifiedAt: companyAccount.companyProfile?.verifiedAt || null,
        verifiedBy: companyAccount.companyProfile?.verifiedBy || null
      },
      companyAccess: {
        companyAccount: invite.companyAccount,
        role: invite.role
      },
      isEmailVerified: true
    });

    invite.status = "accepted";
    invite.acceptedBy = user._id;
    invite.acceptedAt = new Date();
    await invite.save();

    const safeUser = await User.findById(user._id).select("-password");

    return res.json({
      token: createToken(safeUser),
      user: attachProfileCompletion(safeUser)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to accept invite" });
  }
};

export const updateCompanyTeamMemberRole = async (req, res) => {
  try {
    if (!ensureCompanyOwner(req, res)) {
      return;
    }

    const companyId = getCompanyAccountId(req.user);
    const roleInput = String(req.body?.role || "").trim().toLowerCase();

    if (!allowedInviteRoles.has(roleInput)) {
      return res.status(400).json({ message: "role must be recruiter or viewer" });
    }

    const member = await User.findOne({
      _id: req.params.memberId,
      userType: "company",
      "companyAccess.companyAccount": companyId
    }).select("email companyAccess createdAt companyProfile.companyName");

    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }

    member.companyAccess.role = roleInput;
    await member.save();

    return res.json({
      member: toTeamMemberSummary(member, companyId)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update member role" });
  }
};

export const removeCompanyTeamMember = async (req, res) => {
  try {
    if (!ensureCompanyOwner(req, res)) {
      return;
    }

    const companyId = getCompanyAccountId(req.user);

    const member = await User.findOneAndDelete({
      _id: req.params.memberId,
      userType: "company",
      "companyAccess.companyAccount": companyId
    }).select("_id");

    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }

    return res.json({ message: "Team member removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove team member" });
  }
};
