
const validateEnv = () => {
  const requiredVariables = ["MONGO_URI", "JWT_SECRET"];
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name] || !process.env[name].trim()
  );

  if (missingVariables.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVariables.join(", ")}`
    );
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be at least 32 characters long.");
    process.exit(1);
  }
};

module.exports = validateEnv;
