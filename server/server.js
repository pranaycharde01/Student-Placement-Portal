
require("dotenv").config();

const validateEnv = require("./config/validateEnv");
validateEnv();

const connectDB = require("./config/db");
const app = require("./app");

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down server...`);

      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Graceful shutdown timed out.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
