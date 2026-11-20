
const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Opportunity = require("../models/Opportunity");
const User = require("../models/User");
const { protect, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Submit an application.
router.post(
  "/",
  protect,
  authorizeRoles("student"),
  async (req, res, next) => {
    try {
      const { opportunityId, resumeUrl = "", coverNote = "" } = req.body;

      if (
        typeof opportunityId !== "string" ||
        !mongoose.isValidObjectId(opportunityId)
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid opportunity ID is required.",
        });
      }

      if (
        typeof resumeUrl !== "string" ||
        resumeUrl.length > 1000 ||
        typeof coverNote !== "string" ||
        coverNote.length > 3000
      ) {
        return res.status(400).json({
          success: false,
          message: "Resume URL or cover note is invalid or too long.",
        });
      }

      if (resumeUrl.trim()) {
        let parsedUrl;

        try {
          parsedUrl = new URL(resumeUrl.trim());
        } catch {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid resume URL.",
          });
        }

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return res.status(400).json({
            success: false,
            message: "Resume URL must use HTTP or HTTPS.",
          });
        }
      }

      const opportunity = await Opportunity.findById(opportunityId);

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: "Opportunity not found.",
        });
      }

      if (
        opportunity.status !== "active" ||
        opportunity.deadline <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "This opportunity is closed or its deadline has passed.",
        });
      }

      const student = await User.findById(req.user._id);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student account not found.",
        });
      }

      if (
        opportunity.minimumGraduationYear !== null &&
        opportunity.minimumGraduationYear !== undefined &&
        (student.graduationYear === null ||
          student.graduationYear < opportunity.minimumGraduationYear)
      ) {
        return res.status(400).json({
          success: false,
          message: `Eligible students must graduate in or after ${opportunity.minimumGraduationYear}.`,
        });
      }

      if (
        opportunity.maximumGraduationYear !== null &&
        opportunity.maximumGraduationYear !== undefined &&
        (student.graduationYear === null ||
          student.graduationYear > opportunity.maximumGraduationYear)
      ) {
        return res.status(400).json({
          success: false,
          message: `Eligible students must graduate in or before ${opportunity.maximumGraduationYear}.`,
        });
      }

      if (
        opportunity.minimumCGPA !== null &&
        opportunity.minimumCGPA !== undefined &&
        (student.cgpa === null || student.cgpa < opportunity.minimumCGPA)
      ) {
        return res.status(400).json({
          success: false,
          message: `Minimum required CGPA is ${opportunity.minimumCGPA}. Update your profile if your CGPA is missing.`,
        });
      }

      const existingApplication = await Application.findOne({
        student: student._id,
        opportunity: opportunity._id,
      });

      if (existingApplication) {
        return res.status(409).json({
          success: false,
          message: "You have already applied to this opportunity.",
        });
      }

      const application = await Application.create({
        student: student._id,
        opportunity: opportunity._id,
        resumeUrl: resumeUrl.trim(),
        coverNote: coverNote.trim(),
      });

      return res.status(201).json({
        success: true,
        message: "Application submitted successfully.",
        application: {
          id: application._id,
          opportunity: opportunity._id,
          status: application.status,
          createdAt: application.createdAt,
        },
      });
    } catch (error) {
      // The database's unique index also protects against simultaneous duplicates.
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already applied to this opportunity.",
        });
      }

      next(error);
    }
  }
);

// View the logged-in student's application history.
router.get(
  "/my",
  protect,
  authorizeRoles("student"),
  async (req, res, next) => {
    try {
      const applications = await Application.find({
        student: req.user._id,
      })
        .populate(
          "opportunity",
          "title organization opportunityType location workMode deadline status"
        )
        .select("-reviewerNote -reviewedBy -student")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        applications,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
