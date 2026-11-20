
const express = require("express");
const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const { protect, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

const allowedOpportunityFields = [
  "title",
  "organization",
  "description",
  "opportunityType",
  "location",
  "workMode",
  "eligibility",
  "requiredSkills",
  "deadline",
  "minimumGraduationYear",
  "maximumGraduationYear",
  "minimumCGPA",
];

const allowedStatuses = ["draft", "active", "closed", "archived"];
const allowedApplicationStatuses = [
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Rejected",
  "Selected",
];

const validateOpportunityInput = (data, isUpdate = false) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Provide a valid opportunity object.";
  }

  const allowedFields = [...allowedOpportunityFields, "status"];
  const unknownFields = Object.keys(data).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length > 0) {
    return `Unsupported fields: ${unknownFields.join(", ")}`;
  }

  if (!isUpdate) {
    const requiredFields = [
      "title",
      "organization",
      "description",
      "opportunityType",
      "deadline",
    ];

    const missing = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === ""
    );

    if (missing.length > 0) {
      return `Missing required fields: ${missing.join(", ")}`;
    }
  }

  for (const field of ["title", "organization", "description"]) {
    if (field in data) {
      if (
        typeof data[field] !== "string" ||
        !data[field].trim() ||
        data[field].length >
          (field === "description" ? 10000 : 150)
      ) {
        return `${field} is invalid or too long.`;
      }
    }
  }

  if (
    "opportunityType" in data &&
    !["internship", "job"].includes(data.opportunityType)
  ) {
    return "Opportunity type must be internship or job.";
  }

  if (
    "workMode" in data &&
    !["onsite", "hybrid", "remote"].includes(data.workMode)
  ) {
    return "Work mode must be onsite, hybrid, or remote.";
  }

  if ("status" in data && !allowedStatuses.includes(data.status)) {
    return "Invalid opportunity status.";
  }

  if ("deadline" in data) {
    const deadline = new Date(data.deadline);

    if (
      typeof data.deadline !== "string" ||
      !data.deadline.trim() ||
      Number.isNaN(deadline.getTime())
    ) {
      return "A valid deadline is required.";
    }
  }

  for (const field of ["minimumGraduationYear", "maximumGraduationYear"]) {
    if (
      field in data &&
      data[field] !== null &&
      (!Number.isInteger(data[field]) ||
        data[field] < 2000 ||
        data[field] > 2100)
    ) {
      return `${field} must be a valid year or null.`;
    }
  }

  if (
    data.minimumGraduationYear != null &&
    data.maximumGraduationYear != null &&
    data.minimumGraduationYear > data.maximumGraduationYear
  ) {
    return "Minimum graduation year cannot exceed maximum graduation year.";
  }

  if (
    "minimumCGPA" in data &&
    data.minimumCGPA !== null &&
    (typeof data.minimumCGPA !== "number" ||
      !Number.isFinite(data.minimumCGPA) ||
      data.minimumCGPA < 0 ||
      data.minimumCGPA > 10)
  ) {
    return "Minimum CGPA must be between 0 and 10, or null.";
  }

  if ("requiredSkills" in data) {
    if (
      !Array.isArray(data.requiredSkills) ||
      data.requiredSkills.length > 50 ||
      !data.requiredSkills.every(
        (skill) =>
          typeof skill === "string" &&
          skill.trim().length > 0 &&
          skill.trim().length <= 50
      )
    ) {
      return "Provide up to 50 valid required skills.";
    }
  }

  if ("location" in data) {
    if (
      typeof data.location !== "string" ||
      data.location.length > 150
    ) {
      return "Location must be a string of at most 150 characters.";
    }
  }

  if ("eligibility" in data) {
    if (
      typeof data.eligibility !== "string" ||
      data.eligibility.length > 3000
    ) {
      return "Eligibility must be a string of at most 3000 characters.";
    }
  }

  return null;
};

// Dashboard statistics.
router.get("/dashboard", async (req, res, next) => {
  try {
    const [
      totalOpportunities,
      activeOpportunities,
      totalApplications,
      applicationsByStatus,
    ] = await Promise.all([
      Opportunity.countDocuments(),
      Opportunity.countDocuments({ status: "active" }),
      Application.countDocuments(),
      Application.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      stats: {
        totalOpportunities,
        activeOpportunities,
        totalApplications,
        applicationsByStatus: Object.fromEntries(
          applicationsByStatus.map((item) => [item._id, item.count])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

// List all opportunities, including drafts and closed posts.
router.get("/opportunities", async (req, res, next) => {
  try {
    const opportunities = await Opportunity.find()
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, opportunities });
  } catch (error) {
    next(error);
  }
});

// Create an opportunity.
router.post("/opportunities", async (req, res, next) => {
  try {
    const validationError = validateOpportunityInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const opportunity = await Opportunity.create({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Opportunity created successfully.",
      opportunity,
    });
  } catch (error) {
    next(error);
  }
});

// Update an opportunity.
router.patch("/opportunities/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity ID.",
      });
    }

    const validationError = validateOpportunityInput(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found.",
      });
    }

    return res.json({
      success: true,
      message: "Opportunity updated successfully.",
      opportunity,
    });
  } catch (error) {
    next(error);
  }
});

// Archive an opportunity rather than permanently deleting its history.
router.delete("/opportunities/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity ID.",
      });
    }

    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "archived" } },
      { new: true }
    );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found.",
      });
    }

    return res.json({
      success: true,
      message: "Opportunity archived successfully.",
    });
  } catch (error) {
    next(error);
  }
});

// Review and filter applications.
router.get("/applications", async (req, res, next) => {
  try {
    const { status, opportunityId } = req.query;
    const filter = {};

    if (
      status !== undefined &&
      !allowedApplicationStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status filter.",
      });
    }

    if (status) filter.status = status;

    if (opportunityId) {
      if (
        typeof opportunityId !== "string" ||
        !mongoose.isValidObjectId(opportunityId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid opportunity ID.",
        });
      }

      filter.opportunity = opportunityId;
    }

    const applications = await Application.find(filter)
      .populate("student", "fullName email department graduationYear cgpa skills")
      .populate("opportunity", "title organization opportunityType deadline")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, applications });
  } catch (error) {
    next(error);
  }
});

// Update an application's review status and notes.
router.patch("/applications/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID.",
      });
    }

    const { status, reviewerNote = "" } = req.body;

    if (
      !allowedApplicationStatuses.includes(status) ||
      typeof reviewerNote !== "string" ||
      reviewerNote.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid status and reviewer note.",
      });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          reviewerNote: reviewerNote.trim(),
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate("student", "fullName email")
      .populate("opportunity", "title organization");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    return res.json({
      success: true,
      message: "Application reviewed successfully.",
      application,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
