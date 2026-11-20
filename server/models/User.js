
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
      immutable: true,
    },

    department: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    graduationYear: {
      type: Number,
      min: 2000,
      max: 2100,
      default: null,
    },

    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    contactNumber: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },

    skills: {
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
        message: "Provide up to 50 valid skills, each up to 50 characters",
      },
    },

    educationSummary: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    portfolioUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    githubUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    linkedInUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("User", userSchema);
