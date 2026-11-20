
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const createToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
});

router.post("/register", async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 80 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters.",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration always creates a student account.
    const user = await User.create({
      fullName: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "student",
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User account not found.",
    });
  }

  return res.json({
    success: true,
    user: {
      ...publicUser(user),
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
});

module.exports = router;
