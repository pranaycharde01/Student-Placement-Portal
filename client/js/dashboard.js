
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    if (!API.requireRole("student")) {
        return;
    }

    const welcomeHeading = document.getElementById("welcome-heading");
    const availableCount = document.getElementById("available-count");
    const applicationCount = document.getElementById("application-count");
    const profileCompletion = document.getElementById("profile-completion");
    const recentApplications = document.getElementById("recent-applications");
    const latestOpportunities = document.getElementById("latest-opportunities");
    const messageBox = document.getElementById("dashboard-message");
    const logoutButton = document.getElementById("logout-button");

    logoutButton.addEventListener("click", () => API.logout());

    function showMessage(message) {
        messageBox.textContent = message;
        messageBox.className = "form-message error";
        messageBox.hidden = false;
    }

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function formatDate(value) {
        if (!value) {
            return "Not specified";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Not specified";
        }

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function extractList(result, possibleKeys) {
        if (Array.isArray(result)) {
            return result;
        }

        for (const key of possibleKeys) {
            if (Array.isArray(result?.[key])) {
                return result[key];
            }
        }

        return [];
    }

    async function loadProfile() {
        const result = await API.get("/auth/me");
        const user = result.user;

        if (!user) {
            throw new Error("Unable to load your profile.");
        }

        welcomeHeading.textContent = `Welcome back, ${user.fullName || "Student"}!`;

        const fields = [
            user.fullName,
            user.email,
            user.department,
            user.graduationYear,
            user.cgpa,
            user.contactNumber,
            Array.isArray(user.skills) && user.skills.length > 0
                ? user.skills.join(", ")
                : "",
            user.educationSummary,
            user.portfolioUrl,
            user.githubUrl,
            user.linkedInUrl
        ];

        const completedFields = fields.filter((value) => {
            if (typeof value === "number") {
                return Number.isFinite(value);
            }

            return typeof value === "string" && value.trim().length > 0;
        }).length;

        profileCompletion.textContent =
            `${Math.round((completedFields / fields.length) * 100)}%`;

        return user;
    }

    async function loadOpportunities() {
        const result = await API.get("/opportunities");
        const opportunities = extractList(result, ["opportunities", "data"]);

        availableCount.textContent =
            result.pagination?.total ?? opportunities.length;

        latestOpportunities.replaceChildren();

        if (opportunities.length === 0) {
            latestOpportunities.appendChild(
                makeElement(
                    "div",
                    "empty-state",
                    "No opportunities are available right now. Please check again later."
                )
            );
            return;
        }

        opportunities.slice(0, 3).forEach((opportunity) => {
            const card = makeElement("article", "opportunity-card");
            const title = makeElement("h3", "", opportunity.title || "Untitled opportunity");
            const organization = makeElement(
                "p",
                "",
                opportunity.organization || "Organization not specified"
            );
            const details = makeElement(
                "p",
                "",
                `${opportunity.opportunityType || "Opportunity"} · ${opportunity.location || "Location not specified"}`
            );
            const deadline = makeElement(
                "p",
                "",
                `Deadline: ${formatDate(opportunity.deadline)}`
            );
            const link = makeElement("a", "btn btn-primary", "View opportunity");
            link.href = "/opportunities.html";

            card.append(title, organization, details, deadline, link);
            latestOpportunities.appendChild(card);
        });
    }

    async function loadApplications() {
        const result = await API.get("/applications/my");
        const applications = extractList(result, ["applications", "data"]);

        applicationCount.textContent = applications.length;
        recentApplications.replaceChildren();

        if (applications.length === 0) {
            const empty = makeElement(
                "div",
                "empty-state",
                "You haven't applied to any opportunities yet."
            );

            const link = makeElement("a", "btn btn-primary", "Explore opportunities");
            link.href = "/opportunities.html";

            empty.appendChild(document.createElement("br"));
            empty.appendChild(link);
            recentApplications.appendChild(empty);
            return;
        }

        const tableWrapper = makeElement("div", "table-wrapper");
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        ["Opportunity", "Organization", "Applied on", "Status"].forEach((label) => {
            headerRow.appendChild(makeElement("th", "", label));
        });

        thead.appendChild(headerRow);

        const tbody = document.createElement("tbody");

        applications.slice(0, 5).forEach((application) => {
            const row = document.createElement("tr");
            const opportunity = application.opportunity || {};

            row.appendChild(
                makeElement("td", "", opportunity.title || "Opportunity")
            );
            row.appendChild(
                makeElement("td", "", opportunity.organization || "—")
            );
            row.appendChild(
                makeElement("td", "", formatDate(application.createdAt))
            );

            const statusCell = document.createElement("td");
            const status = makeElement(
                "span",
                "badge",
                application.status || "Submitted"
            );

            statusCell.appendChild(status);
            row.appendChild(statusCell);
            tbody.appendChild(row);
        });

        table.append(thead, tbody);
        tableWrapper.appendChild(table);
        recentApplications.appendChild(tableWrapper);
    }

    async function init() {
        try {
            await Promise.all([
                loadProfile(),
                loadOpportunities(),
                loadApplications()
            ]);
        } catch (error) {
            showMessage(
                error.message || "Some dashboard information could not be loaded."
            );

            if (latestOpportunities.children.length === 0) {
                latestOpportunities.replaceChildren(
                    makeElement("div", "empty-state", "Unable to load opportunities.")
                );
            }

            if (recentApplications.textContent.includes("Loading")) {
                recentApplications.replaceChildren(
                    makeElement("div", "empty-state", "Unable to load applications.")
                );
            }
        }
    }

    init();
});
