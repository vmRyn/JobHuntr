import mongoose from "mongoose";

const { Schema } = mongoose;

const companyInviteSchema = new Schema(
  {
    companyAccount: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ["recruiter", "viewer"],
      required: true
    },
    tokenHash: {
      type: String,
      required: true,
      select: false
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked", "expired"],
      default: "pending"
    },
    expiresAt: {
      type: Date,
      required: true
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    acceptedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

companyInviteSchema.index({ companyAccount: 1, email: 1, status: 1 });

const CompanyInvite = mongoose.model("CompanyInvite", companyInviteSchema);

export default CompanyInvite;
