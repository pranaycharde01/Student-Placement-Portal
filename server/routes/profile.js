
const express = require("express");
const User = require("../models/User");
const { protect, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

const editableFields = [
  "department",
  "graduationYear",
  "cgpa",
  "contactNumber",
  "skills",
  "educationSummary",
  "portfolioUrl",
  "githubUrl",
  "linkedInUrl",
];

const validateUrl = (value, fieldName) => {
  if (value === "") return null;

  if (typeof value !== "string") {
    return `${fieldName} must be a valid URL.`;
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return `${fieldName} must use HTTP or HTTPS.`;
    }

    return null;
  } catch {
    return `${fieldName} must be a valid URL.`;
  }
};

router.get("/", protect, authorizeRoles("student"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    return res.json({
      success: true,
      profile: {
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        contactNumber: user.contactNumber,
        skills: user.skills,
        educationSummary: user.educationSummary,
        portfolioUrl: user.portfolioUrl,
        githubUrl: user.githubUrl,
        linkedInUrl: user.linkedInUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/", protect, authorizeRoles("student"), async (req, res, next) => {
  try {
    const updates = req.body;

    if (
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid profile data.",
      });
    }

    const unknownFields = Object.keys(updates).filter(
      (key) => !editableFields.includes(key)
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `These fields cannot be updated: ${unknownFields.join(", ")}`,
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    for (const field of ["department", "contactNumber", "educationSummary"]) {
      if (
        field in updates &&
        (typeof updates[field] !== "string" ||
          updates[field].length > (field === "educationSummary" ? 2000 : 100))
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid string within the allowed length.`,
        });
      }
    }

    if ("graduationYear" in updates) {
      const year = updates.graduationYear;

      if (
        year !== null &&
        (!Number.isInteger(year) || year < 2000 || year > 2100)
      ) {
        return res.status(400).json({
          success: false,
          message: "Graduation year must be a valid year or null.",
        });
      }
    }

    if ("cgpa" in updates) {
      const cgpa = updates.cgpa;

      if (
        cgpa !== null &&
        (typeof cgpa !== "number" || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)
      ) {
        return res.status(400).json({
          success: false,
          message: "CGPA must be between 0 and 10, or null.",
        });
      }
    }

    if ("skills" in updates) {
      if (
        !Array.isArray(updates.skills) ||
        updates.skills.length > 50 ||
        !updates.skills.every(
          (skill) =>
            typeof skill === "string" &&
            skill.trim().length > 0 &&
            skill.trim().length <= 50
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide up to 50 valid skills, each up to 50 characters.",
        });
      }

      updates.skills = updates.skills.map((skill) => skill.trim());
    }

    for (const field of ["portfolioUrl", "githubUrl", "linkedInUrl"]) {
      if (field in updates) {
        const urlError = validateUrl(updates[field], field);

        if (urlError) {
          return res.status(400).json({
            success: false,
            message: urlError,
          });
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      profile: {
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        contactNumber: user.contactNumber,
        skills: user.skills,
        educationSummary: user.educationSummary,
        portfolioUrl: user.portfolioUrl,
        githubUrl: user.githubUrl,
        linkedInUrl: user.linkedInUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
