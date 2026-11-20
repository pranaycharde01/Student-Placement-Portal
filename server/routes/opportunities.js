
const express = require("express");
const Opportunity = require("../models/Opportunity");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const {
      search = "",
      type,
      location,
      workMode,
      skill,
      page = "1",
      limit = "10",
    } = req.query;

    if (
      typeof search !== "string" ||
      search.length > 100 ||
      (location !== undefined &&
        (typeof location !== "string" || location.length > 100)) ||
      (skill !== undefined &&
        (typeof skill !== "string" || skill.length > 50))
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more search filters are invalid.",
      });
    }

    if (
      type !== undefined &&
      !["internship", "job"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Type must be internship or job.",
      });
    }

    if (
      workMode !== undefined &&
      !["onsite", "hybrid", "remote"].includes(workMode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Work mode must be onsite, hybrid, or remote.",
      });
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 50.",
      });
    }

    const filter = {
      status: "active",
      deadline: { $gt: new Date() },
    };

    if (type) filter.opportunityType = type;

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (workMode) filter.workMode = workMode;

    if (skill) {
      filter.requiredSkills = { $regex: skill, $options: "i" };
    }

    if (search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = { $regex: escapedSearch, $options: "i" };

      filter.$or = [
        { title: searchRegex },
        { organization: searchRegex },
        { description: searchRegex },
      ];
    }

    const [opportunities, total] = await Promise.all([
      Opportunity.find(filter)
        .select("-createdBy")
        .sort({ deadline: 1, createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      Opportunity.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      opportunities,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
