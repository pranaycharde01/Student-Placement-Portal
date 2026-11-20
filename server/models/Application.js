
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
    },

    resumeUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    coverNote: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "Shortlisted",
        "Rejected",
        "Selected",
      ],
      default: "Submitted",
    },

    reviewerNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// A student can apply to an opportunity only once.
applicationSchema.index(
  { student: 1, opportunity: 1 },
  { unique: true }
);

applicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
