
"use strict";

const API_BASE = "/api";

const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");
const authHeading = document.getElementById("auth-heading");
const authDescription = document.getElementById("auth-description");
const messageBox = document.getElementById("auth-message");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

function showMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.className = `form-message ${type}`;
    messageBox.hidden = false;
}

function clearMessage() {
    messageBox.textContent = "";
    messageBox.className = "form-message";
    messageBox.hidden = true;
}

function switchTab(tab) {
    const isLogin = tab === "login";

    loginPanel.hidden = !isLogin;
    registerPanel.hidden = isLogin;

    loginTab.classList.toggle("active", isLogin);
    registerTab.classList.toggle("active", !isLogin);

    loginTab.setAttribute("aria-selected", String(isLogin));
    registerTab.setAttribute("aria-selected", String(!isLogin));

    authHeading.textContent = isLogin ? "Welcome back" : "Create your account";
    authDescription.textContent = isLogin
        ? "Log in to continue to your account."
        : "Register to discover placement opportunities.";

    clearMessage();
}

loginTab.addEventListener("click", () => switchTab("login"));
registerTab.addEventListener("click", () => switchTab("register"));

async function sendAuthRequest(endpoint, payload, submitButton, defaultLabel) {
    submitButton.disabled = true;
    submitButton.textContent = "Please wait...";
    clearMessage();

    try {
        const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Request failed. Please try again.");
        }

        if (!result.token || !result.user) {
            throw new Error("The server returned an unexpected response.");
        }

        // Save only after a successful response.
        sessionStorage.setItem("authToken", result.token);
        sessionStorage.setItem("currentUser", JSON.stringify(result.user));

        showMessage(
            endpoint === "register"
                ? "Account created successfully. Opening your dashboard..."
                : "Login successful. Opening your dashboard...",
            "success"
        );

        window.location.assign(
            result.user.role === "admin"
                ? "/admin.html"
                : "/dashboard.html"
        );
    } catch (error) {
        showMessage(error.message || "Unable to connect. Please try again.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = defaultLabel;
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    const button = loginForm.querySelector('button[type="submit"]');

    await sendAuthRequest(
        "login",
        { email, password },
        button,
        "Log in to your account"
    );
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (fullName.length < 2 || fullName.length > 80) {
        showMessage("Your full name must be between 2 and 80 characters.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage("Please enter a valid email address.");
        return;
    }

    if (password.length < 8 || password.length > 72) {
        showMessage("Your password must be between 8 and 72 characters.");
        return;
    }

    const button = registerForm.querySelector('button[type="submit"]');

    await sendAuthRequest(
        "register",
        { fullName, email, password },
        button,
        "Create student account"
    );
});

// If a session already exists, send the user to the relevant dashboard.
async function redirectIfLoggedIn() {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            sessionStorage.removeItem("authToken");
            sessionStorage.removeItem("currentUser");
            return;
        }

        const result = await response.json();

        if (result.success && result.user) {
            sessionStorage.setItem("currentUser", JSON.stringify(result.user));

            window.location.replace(
                result.user.role === "admin"
                    ? "/admin.html"
                    : "/dashboard.html"
            );
        }
    } catch {
        // Keep the login page available if the API is temporarily unreachable.
    }
}

redirectIfLoggedIn();