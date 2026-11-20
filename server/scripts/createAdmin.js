
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createAdmin() {
    const name = process.env.ADMIN_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing from your .env file.");
    }

    if (!name || !email || !password) {
        throw new Error(
            "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in your .env file."
        );
    }

    if (password.length < 12) {
        throw new Error(
            "ADMIN_PASSWORD must contain at least 12 characters."
        );
    }

    await mongoose.connect(process.env.MONGO_URI);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        if (existingUser.role === "admin") {
            console.log("An administrator with this email already exists.");
            return;
        }

        throw new Error(
            "This email belongs to an existing student. Use a different admin email."
        );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
        fullName: name,
        email,
        passwordHash,
        role: "admin"
    });

    console.log("Administrator account created successfully.");
    console.log(`Admin email: ${email}`);
    console.log("Keep the administrator password private.");
}

createAdmin()
    .catch((error) => {
        console.error("Admin creation failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
