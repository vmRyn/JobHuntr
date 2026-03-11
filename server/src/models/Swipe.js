import mongoose from "mongoose";

const { Schema } = mongoose;

const swipeSchema = new Schema(
  {
    swiper: {
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
    },
    direction: {
      type: String,
      enum: ["left", "right"],
      required: true
    }
  },
  { timestamps: true }
);

swipeSchema.index(
  { swiper: 1, targetType: 1, targetJob: 1, targetUser: 1 },
  { unique: true }
);

const Swipe = mongoose.model("Swipe", swipeSchema);

export default Swipe;
