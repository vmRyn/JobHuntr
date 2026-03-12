import mongoose from "mongoose";

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    sourceType: {
      type: String,
      enum: ["user", "automation"],
      default: "user"
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    targetType: {
      type: String,
      enum: ["job", "company", "message"],
      required: true
    },
    targetJob: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    targetMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    reasonCategory: {
      type: String,
      enum: [
        "spam",
        "scam",
        "harassment",
        "misleading_job",
        "hate_or_abuse",
        "duplicate",
        "other"
      ],
      default: "other"
    },
    details: {
      type: String,
      trim: true,
      default: ""
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    automationSignals: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "dismissed"],
      default: "open"
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
    },
    resolutionAction: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
