import mongoose from "mongoose";

const { Schema } = mongoose;

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
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

messageSchema.index({ match: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
