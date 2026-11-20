
document.addEventListener("DOMContentLoaded", () => {
    const opportunityList = document.getElementById("opportunity-list");
    const filterForm = document.getElementById("filter-form");
    const clearFiltersButton = document.getElementById("clear-filters");
    const resultsSummary = document.getElementById("results-summary");
    const pageIndicator = document.getElementById("page-indicator");
    const previousButton = document.getElementById("previous-page");
    const nextButton = document.getElementById("next-page");
    const pageMessage = document.getElementById("page-message");
    const logoutButton = document.getElementById("logout-button");

    let currentPage = 1;
    const pageSize = 9;
    let totalPages = 1;

    if (!API.requireLogin()) {
        return;
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            API.logout();
        });
    }

    function showMessage(message, type = "error") {
        pageMessage.textContent = message;
        pageMessage.className = `form-message ${type}`;
        pageMessage.hidden = false;
    }

    function clearMessage() {
        pageMessage.textContent = "";
        pageMessage.hidden = true;
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

    function createOpportunityCard(opportunity) {
        const card = createElement("article", "opportunity-card");
        const header = createElement("div", "opportunity-card-header");
        const titleArea = createElement("div", "");
        const title = createElement("h3", "", opportunity.title || "Untitled role");
        const organization = createElement(
            "p",
            "muted-text",
            opportunity.organization || "Organization not specified"
        );

        const type = createElement(
            "span",
            "badge",
            opportunity.opportunityType === "job" ? "Full-time job" : "Internship"
        );

        titleArea.append(title, organization);
        header.append(titleArea, type);

        const description = createElement(
            "p",
            "opportunity-description",
            opportunity.description || "No description provided."
        );

        const details = createElement("div", "opportunity-details");

        details.append(
            createElement(
                "span",
                "",
                `Location: ${opportunity.location || "Not specified"}`
            ),
            createElement(
                "span",
                "",
                `Mode: ${formatWorkMode(opportunity.workMode)}`
            ),
            createElement(
                "span",
                "",
                `Deadline: ${formatDate(opportunity.deadline)}`
            )
        );

        const skillsContainer = createElement("div", "skill-list");

        if (Array.isArray(opportunity.requiredSkills) &&
            opportunity.requiredSkills.length > 0) {
            opportunity.requiredSkills.slice(0, 6).forEach((skill) => {
                skillsContainer.append(
                    createElement("span", "skill-tag", skill)
                );
            });
        } else {
            skillsContainer.append(
                createElement("span", "muted-text", "Skills not specified")
            );
        }

        const footer = createElement("div", "opportunity-card-footer");
        const eligibility = createElement(
            "p",
            "muted-text",
            opportunity.eligibility || "Check the opportunity requirements."
        );

        const applyButton = createElement("button", "btn btn-primary", "View & Apply");
        applyButton.type = "button";

        applyButton.addEventListener("click", () => {
            openApplicationDialog(opportunity);
        });

        footer.append(eligibility, applyButton);
        card.append(header, description, details, skillsContainer, footer);

        return card;
    }

    function formatWorkMode(mode) {
        const labels = {
            onsite: "On-site",
            hybrid: "Hybrid",
            remote: "Remote"
        };

        return labels[mode] || "Not specified";
    }

    async function loadOpportunities() {
        clearMessage();

        opportunityList.replaceChildren(
            createElement("div", "loading", "Loading opportunities...")
        );

        previousButton.disabled = true;
        nextButton.disabled = true;

        const params = new URLSearchParams();
        const formData = new FormData(filterForm);

        for (const [key, value] of formData.entries()) {
            const cleanedValue = String(value).trim();

            if (cleanedValue) {
                params.set(key, cleanedValue);
            }
        }

        params.set("page", String(currentPage));
        params.set("limit", String(pageSize));

        try {
            const result = await API.get(
                `/opportunities?${params.toString()}`
            );

            const opportunities = Array.isArray(result.opportunities)
                ? result.opportunities
                : [];

            const pagination = result.pagination || {};

            totalPages = Math.max(
                1,
                Number(pagination.totalPages) || 1
            );

            if (currentPage > totalPages) {
                currentPage = totalPages;
                await loadOpportunities();
                return;
            }

            opportunityList.replaceChildren();

            if (opportunities.length === 0) {
                opportunityList.append(
                    createElement(
                        "div",
                        "empty-state",
                        "No opportunities found. Try changing your filters."
                    )
                );
            } else {
                opportunities.forEach((opportunity) => {
                    opportunityList.append(
                        createOpportunityCard(opportunity)
                    );
                });
            }

            const total = Number(pagination.total);

            resultsSummary.textContent = Number.isFinite(total)
                ? `${total} opportunit${total === 1 ? "y" : "ies"} found`
                : `${opportunities.length} opportunities shown`;

            pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
            previousButton.disabled = currentPage <= 1;
            nextButton.disabled = currentPage >= totalPages;
        } catch (error) {
            opportunityList.replaceChildren(
                createElement(
                    "div",
                    "empty-state",
                    "Unable to load opportunities. Please try again."
                )
            );

            showMessage(error.message || "Could not load opportunities.");
        }
    }

    async function openApplicationDialog(opportunity) {
        const dialog = document.createElement("dialog");
        dialog.className = "application-dialog";

        const heading = createElement("h2", "", "Apply for opportunity");
        const role = createElement(
            "p",
            "muted-text",
            `${opportunity.title} at ${opportunity.organization || "the organization"}`
        );

        const form = document.createElement("form");
        form.method = "dialog";
        form.className = "dialog-form";

        const resumeGroup = createElement("div", "form-group");
        const resumeLabel = createElement("label", "", "Resume or portfolio URL");
        resumeLabel.htmlFor = "application-resume-url";

        const resumeInput = document.createElement("input");
        resumeInput.type = "url";
        resumeInput.id = "application-resume-url";
        resumeInput.name = "resumeUrl";
        resumeInput.placeholder = "https://example.com/my-resume";
        resumeInput.maxLength = 500;
        resumeInput.required = true;

        resumeGroup.append(resumeLabel, resumeInput);

        const noteGroup = createElement("div", "form-group");
        const noteLabel = createElement("label", "", "Cover note (optional)");
        noteLabel.htmlFor = "application-cover-note";

        const noteInput = document.createElement("textarea");
        noteInput.id = "application-cover-note";
        noteInput.name = "coverNote";
        noteInput.rows = 5;
        noteInput.maxLength = 2000;
        noteInput.placeholder = "Briefly explain why you are interested.";

        noteGroup.append(noteLabel, noteInput);

        const message = createElement("p", "form-message");
        message.setAttribute("role", "status");
        message.hidden = true;

        const actions = createElement("div", "actions");

        const cancelButton = createElement(
            "button",
            "btn btn-secondary",
            "Cancel"
        );
        cancelButton.type = "button";

        const submitButton = createElement(
            "button",
            "btn btn-primary",
            "Submit application"
        );
        submitButton.type = "submit";

        actions.append(cancelButton, submitButton);
        form.append(resumeGroup, noteGroup, message, actions);
        dialog.append(heading, role, form);

        document.body.append(dialog);

        cancelButton.addEventListener("click", () => {
            dialog.close();
        });

        dialog.addEventListener("close", () => {
            dialog.remove();
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            message.hidden = true;
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";

            try {
                const payload = {
                    opportunityId: opportunity._id,
                    resumeUrl: resumeInput.value.trim(),
                    coverNote: noteInput.value.trim()
                };

                await API.post("/applications", payload);

                dialog.close();
                showMessage("Application submitted successfully.", "success");
                await loadOpportunities();
            } catch (error) {
                message.textContent =
                    error.message || "Unable to submit your application.";
                message.className = "form-message error";
                message.hidden = false;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Submit application";
            }
        });

        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) {
                dialog.close();
            }
        });

        dialog.showModal();
    }

    filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        currentPage = 1;
        loadOpportunities();
    });

    clearFiltersButton.addEventListener("click", () => {
        filterForm.reset();
        currentPage = 1;
        loadOpportunities();
    });

    previousButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage -= 1;
            loadOpportunities();
        }
    });

    nextButton.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            loadOpportunities();
        }
    });

    loadOpportunities();
});
