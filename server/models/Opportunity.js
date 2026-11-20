
const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Opportunity title is required"],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    organization: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 10000,
    },

    opportunityType: {
      type: String,
      enum: ["internship", "job"],
      required: true,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "Not specified",
    },

    workMode: {
      type: String,
      enum: ["onsite", "hybrid", "remote"],
      default: "onsite",
    },

    eligibility: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    requiredSkills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills) =>
          skills.length <= 50 &&
          skills.every(
            (skill) =>
              typeof skill === "string" &&
              skill.trim().length > 0 &&
              skill.trim().length <= 50
          ),
        message: "Provide up to 50 valid required skills",
      },
    },

    deadline: {
      type: Date,
      required: [true, "Application deadline is required"],
    },

    minimumGraduationYear: {
      type: Number,
      min: 2000,
      max: 2100,
      default: null,
    },

    maximumGraduationYear: {
      type: Number,
      min: 2000,
      max: 2100,
      default: null,
    },

    minimumCGPA: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "active", "closed", "archived"],
      default: "draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

opportunitySchema.index({ status: 1, deadline: 1 });

module.exports = mongoose.model("Opportunity", opportunitySchema);
