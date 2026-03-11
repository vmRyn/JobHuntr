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
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    reactions: {
      type: [messageReactionSchema],
      default: []
    }
  },
  { timestamps: true }
);

messageSchema.pre("validate", function ensureContent(next) {
  const messageText = typeof this.text === "string" ? this.text.trim() : "";
  const attachmentUrl = this.attachment?.url || "";

  this.text = messageText;

  if (!messageText && !attachmentUrl) {
    this.invalidate("text", "Message text or attachment is required");
  }

  next();
});

messageSchema.index({ match: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
