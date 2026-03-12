import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const seekerProfileSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
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

const User = mongoose.model("User", userSchema);

export default User;
