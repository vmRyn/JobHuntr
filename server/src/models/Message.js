import mongoose from "mongoose";

const { Schema } = mongoose;

const messageAttachmentSchema = new Schema(
  {
    url: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 }
  },
  { _id: false }
);

const interviewAttachmentSchema = new Schema(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    title: { type: String, trim: true, default: "Interview" },
    jobTitle: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, trim: true, default: "UTC" },
    location: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    }
  },
  { _id: false }
);

const messageReactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const messageModerationSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["clean", "flagged", "hidden", "deleted"],
      default: "clean"
    },
    riskScore: {
      type: Number,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low"
    },
    flaggedKeywords: {
      type: [String],
      default: []
    },
    matchedPatterns: {
      type: [String],
      default: []
    },
    flaggedByAutomation: {
      type: Boolean,
      default: false
    },
    flaggedAt: {
      type: Date,
      default: null
    },
    adminAction: {
      action: { type: String, trim: true, default: "" },
      reason: { type: String, trim: true, default: "" },
      admin: { type: Schema.Types.ObjectId, ref: "User", default: null },
      actedAt: { type: Date, default: null }
    }
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      trim: true
    },
    attachment: {
      type: messageAttachmentSchema,
      default: null
    },
    interviewAttachment: {
      type: interviewAttachmentSchema,
      default: null
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    reactions: {
      type: [messageReactionSchema],
      default: []
    },
    moderation: {
      type: messageModerationSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

messageSchema.pre("validate", function ensureContent(next) {
  const messageText = typeof this.text === "string" ? this.text.trim() : "";
  const attachmentUrl = this.attachment?.url || "";
  const hasInterviewAttachment = Boolean(this.interviewAttachment?.interviewId);

  this.text = messageText;

  if (!messageText && !attachmentUrl && !hasInterviewAttachment) {
    this.invalidate("text", "Message text or attachment is required");
  }

  next();
});

messageSchema.index({ match: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
