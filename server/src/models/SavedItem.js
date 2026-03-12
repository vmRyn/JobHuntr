import mongoose from "mongoose";

const { Schema } = mongoose;

const savedItemSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    targetType: {
      type: String,
      enum: ["job", "candidate"],
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
    }
  },
  { timestamps: true }
);

savedItemSchema.index(
  { user: 1, targetType: 1, targetJob: 1, targetUser: 1 },
  { unique: true }
);

const SavedItem = mongoose.model("SavedItem", savedItemSchema);

export default SavedItem;
