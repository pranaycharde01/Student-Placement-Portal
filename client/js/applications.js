
document.addEventListener("DOMContentLoaded", () => {
    const applicationsList = document.getElementById("applications-list");
    const emptyState = document.getElementById("empty-state");
    const pageMessage = document.getElementById("page-message");
    const statusFilter = document.getElementById("status-filter");
    const searchFilter = document.getElementById("search-filter");
    const sortFilter = document.getElementById("sort-filter");
    const logoutButton = document.getElementById("logout-button");

    let allApplications = [];

    if (!API.requireLogin()) {
        return;
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => API.logout());
    }

    function showMessage(message, type = "error") {
        pageMessage.textContent = message;
        pageMessage.className = `form-message ${type}`;
        pageMessage.hidden = false;
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Not specified";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Not specified";
        }

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function getOpportunity(application) {
        return application.opportunity || application.opportunityId || {};
    }

    function getStatusClass(status) {
        const classes = {
            Submitted: "status-submitted",
            "Under Review": "status-review",
            Shortlisted: "status-shortlisted",
            Rejected: "status-rejected",
            Selected: "status-selected"
        };

        return classes[status] || "";
    }

    function updateStatistics(applications) {
        document.getElementById("total-count").textContent =
            applications.length;

        document.getElementById("review-count").textContent =
            applications.filter((application) =>
                application.status === "Under Review"
            ).length;

        document.getElementById("shortlisted-count").textContent =
            applications.filter((application) =>
                application.status === "Shortlisted"
            ).length;

        document.getElementById("selected-count").textContent =
            applications.filter((application) =>
                application.status === "Selected"
            ).length;
    }

    function createApplicationCard(application) {
        const opportunity = getOpportunity(application);
        const card = createElement("article", "application-card");

        const header = createElement("div", "application-card-header");
        const titleArea = createElement("div", "");
        const title = createElement(
            "h3",
            "",
            opportunity.title || "Opportunity no longer available"
        );

        const organization = createElement(
            "p",
            "muted-text",
            opportunity.organization || "Organization not specified"
        );

        titleArea.append(title, organization);

        const status = createElement(
            "span",
            `badge ${getStatusClass(application.status)}`,
            application.status || "Submitted"
        );

        header.append(titleArea, status);

        const details = createElement("div", "application-details");

        details.append(
            createElement(
                "span",
                "",
                `Applied: ${formatDate(application.createdAt)}`
            ),
            createElement(
                "span",
                "",
                `Deadline: ${formatDate(opportunity.deadline)}`
            ),
            createElement(
                "span",
                "",
                `Type: ${
                    opportunity.opportunityType === "job"
                        ? "Full-time job"
                        : "Internship"
                }`
            )
        );

        card.append(header, details);

        if (application.coverNote) {
            const note = createElement("p", "application-note");
            const noteLabel = createElement("strong", "", "Your cover note: ");
            note.append(noteLabel, document.createTextNode(application.coverNote));
            card.append(note);
        }

        if (application.status === "Rejected") {
            card.append(
                createElement(
                    "p",
                    "muted-text",
                    "This application was not selected. Keep exploring other opportunities."
                )
            );
        } else if (application.status === "Selected") {
            card.append(
                createElement(
                    "p",
                    "muted-text",
                    "Congratulations! Your application has been marked as selected."
                )
            );
        }

        return card;
    }

    function renderApplications() {
        const selectedStatus = statusFilter.value;
        const searchTerm = searchFilter.value.trim().toLowerCase();
        const sortOrder = sortFilter.value;

        let filtered = allApplications.filter((application) => {
            const opportunity = getOpportunity(application);
            const matchesStatus =
                !selectedStatus || application.status === selectedStatus;

            const searchableText = [
                opportunity.title,
                opportunity.organization,
                opportunity.location
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !searchTerm || searchableText.includes(searchTerm);

            return matchesStatus && matchesSearch;
        });

        filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();

            return sortOrder === "oldest"
                ? dateA - dateB
                : dateB - dateA;
        });

        applicationsList.replaceChildren();
        emptyState.hidden = filtered.length !== 0;
        applicationsList.hidden = filtered.length === 0;

        if (filtered.length > 0) {
            const fragment = document.createDocumentFragment();

            filtered.forEach((application) => {
                fragment.append(createApplicationCard(application));
            });

            applicationsList.append(fragment);
        }
    }

    async function loadApplications() {
        applicationsList.replaceChildren(
            createElement("div", "loading", "Loading your applications...")
        );

        applicationsList.hidden = false;
        emptyState.hidden = true;
        pageMessage.hidden = true;

        try {
            const result = await API.get("/applications/my");

            allApplications = Array.isArray(result.applications)
                ? result.applications
                : [];

            updateStatistics(allApplications);
            renderApplications();
        } catch (error) {
            applicationsList.replaceChildren();
            applicationsList.hidden = true;
            emptyState.hidden = true;

            showMessage(
                error.message || "Unable to load your application history."
            );
        }
    }

    statusFilter.addEventListener("change", renderApplications);
    searchFilter.addEventListener("input", renderApplications);
    sortFilter.addEventListener("change", renderApplications);

    loadApplications();
});