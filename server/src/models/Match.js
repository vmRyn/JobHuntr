import mongoose from "mongoose";

const { Schema } = mongoose;

const matchSchema = new Schema(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    seeker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

matchSchema.index({ job: 1, seeker: 1, company: 1 }, { unique: true });

const Match = mongoose.model("Match", matchSchema);

export default Match;
