import mongoose from "mongoose";

const { Schema } = mongoose;

const geoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  { _id: false }
);

const jobSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    salary: {
      type: String,
      trim: true,
      default: ""
    },
    industry: {
      type: String,
      trim: true,
      default: ""
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    postcode: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    coordinates: {
      type: geoPointSchema,
      default: undefined
    },
    requiredSkills: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

jobSchema.index({ coordinates: "2dsphere" });

const Job = mongoose.model("Job", jobSchema);

export default Job;
