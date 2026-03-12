import mongoose from "mongoose";

const { Schema } = mongoose;

const appealSchema = new Schema(
  {
    appellant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    userType: {
      type: String,
      enum: ["seeker", "company", "admin"],
      default: "seeker"
    },
    suspensionReasonSnapshot: {
      type: String,
      trim: true,
      default: ""
    },
    appealReason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    sourceType: {
      type: String,
      enum: ["public", "authenticated"],
      default: "public"
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ email: 1, createdAt: -1 });

const Appeal = mongoose.model("Appeal", appealSchema);

export default Appeal;
