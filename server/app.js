
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const opportunityRoutes = require("./routes/opportunities");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5000",
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Student Placement & Internship Portal API is running.",
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);

// Serve the frontend files from the client directory.
const clientDirectory = path.join(__dirname, "..", "client");

app.use(express.static(clientDirectory));

// Handle unknown API endpoints.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// Central error handler.
app.use((error, req, res, next) => {
  console.error("Application error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid input data.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

module.exports = app;
