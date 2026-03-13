import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const notificationChannelSchema = new Schema(
  {
    interviewUpdates: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    matches: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    offers: { type: Boolean, default: true },
    support: { type: Boolean, default: true },
    system: { type: Boolean, default: true }
  },
  { _id: false }
);

const notificationPreferencesSchema = new Schema(
  {
    inApp: {
      type: notificationChannelSchema,
      default: () => ({})
    },
    email: {
      type: notificationChannelSchema,
      default: () => ({
        interviewUpdates: false,
        messages: false,
        matches: false,
        moderation: true,
        offers: true,
        support: true,
        system: true
      })
    },
    push: {
      type: notificationChannelSchema,
      default: () => ({
        interviewUpdates: false,
        messages: false,
        matches: false,
        moderation: false,
        offers: false,
        support: false,
        system: false
      })
    }
  },
  { _id: false }
);

const companyAccessSchema = new Schema(
  {
    companyAccount: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    role: {
      type: String,
      enum: ["owner", "recruiter", "viewer"],
      default: "owner"
    }
  },
  { _id: false }
);

const seekerProfileSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    portfolioUrl: { type: String, trim: true, default: "" },
    projects: { type: [String], default: [] },
    education: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    workHistoryTimeline: { type: [String], default: [] },
    skills: [{ type: String, trim: true }],
    experience: { type: String, trim: true, default: "" },
    industryField: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    profilePicture: { type: String, trim: true, default: "" },
    cvUrl: { type: String, trim: true, default: "" },
    cvOriginalName: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const companyProfileSchema = new Schema(
  {
    companyName: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    proofDocuments: { type: [String], default: [] },
    linkedinUrl: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { _id: false }
);

const adminProfileSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const moderationSchema = new Schema(
  {
    riskScore: { type: Number, default: 0 },
    flaggedMessageCount: { type: Number, default: 0 },
    abusiveActionCount: { type: Number, default: 0 },
    suspiciousCompanyScore: { type: Number, default: 0 },
    riskSignals: { type: [String], default: [] },
    chatRestrictedUntil: { type: Date, default: null },
    chatRestrictionReason: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    userType: {
      type: String,
      enum: ["seeker", "company", "admin"],
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    seekerProfile: {
      type: seekerProfileSchema,
      default: () => ({})
    },
    companyProfile: {
      type: companyProfileSchema,
      default: () => ({})
    },
    adminProfile: {
      type: adminProfileSchema,
      default: () => ({})
    },
    isSuspended: {
      type: Boolean,
      default: false
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: ""
    },
    moderation: {
      type: moderationSchema,
      default: () => ({})
    },
    companyAccess: {
      type: companyAccessSchema,
      default: () => ({})
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({})
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
      default: ""
    },
    emailVerificationExpiresAt: {
      type: Date,
      select: false,
      default: null
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
      default: ""
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
      default: null
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorCodeHash: {
      type: String,
      select: false,
      default: ""
    },
    twoFactorCodeExpiresAt: {
      type: Date,
      select: false,
      default: null
    },
    twoFactorPendingTokenHash: {
      type: String,
      select: false,
      default: ""
    },
    twoFactorPendingExpiresAt: {
      type: Date,
      select: false,
      default: null
    },
    lastPasswordChangedAt: {
      type: Date,
      default: null
    },
    jobListings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Job"
      }
    ]
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ userType: 1, "companyAccess.companyAccount": 1 });

const User = mongoose.model("User", userSchema);

export default User;
