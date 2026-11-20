
document.addEventListener("DOMContentLoaded", () => {
    const pageMessage = document.getElementById("page-message");
    const opportunitiesList = document.getElementById("admin-opportunities-list");
    const applicationsList = document.getElementById("admin-applications-list");

    const opportunityStatusFilter = document.getElementById(
        "opportunity-status-filter"
    );
    const opportunitySearch = document.getElementById("opportunity-search");
    const applicationStatusFilter = document.getElementById(
        "application-status-filter"
    );
    const applicationSearch = document.getElementById("application-search");
    const applicationOpportunityFilter = document.getElementById(
        "application-opportunity-filter"
    );

    const createOpportunityButton = document.getElementById(
        "create-opportunity-button"
    );
    const logoutButton = document.getElementById("logout-button");

    let opportunities = [];
    let applications = [];

    if (!API.requireRole("admin")) return;

    logoutButton.addEventListener("click", () => API.logout());

    function showMessage(message, type = "error") {
        pageMessage.textContent = message;
        pageMessage.className = `form-message ${type}`;
        pageMessage.hidden = false;
    }

    function clearMessage() {
        pageMessage.textContent = "";
        pageMessage.hidden = true;
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function addButton(parent, label, className, callback) {
        const button = element("button", className, label);
        button.type = "button";
        button.addEventListener("click", callback);
        parent.append(button);
        return button;
    }

    function formatDate(value) {
        if (!value) return "Not specified";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Not specified";

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function statusBadge(status) {
        return element(
            "span",
            `badge status-${String(status || "")
                .toLowerCase()
                .replace(/\s+/g, "-")}`,
            status || "Submitted"
        );
    }

    function getOpportunityId(application) {
        const opportunity =
            application.opportunity || application.opportunityId || {};

        return typeof opportunity === "object"
            ? opportunity._id
            : opportunity;
    }

    function getOpportunity(application) {
        return application.opportunity || application.opportunityId || {};
    }

    function getStudent(application) {
        return application.student || application.studentId || {};
    }

    async function loadDashboardStats() {
        try {
            const result = await API.get("/admin/dashboard");
            const stats = result.stats || result.dashboard || result;

            document.getElementById("students-count").textContent =
                stats.totalStudents ?? stats.students ?? 0;

            document.getElementById("active-opportunities-count").textContent =
                stats.activeOpportunities ?? stats.active ?? 0;

            document.getElementById("applications-count").textContent =
                stats.totalApplications ?? stats.applications ?? 0;

            const statusCounts = stats.applicationsByStatus || {};
            document.getElementById("shortlisted-count").textContent =
                stats.shortlistedApplications ??
                stats.shortlisted ??
                statusCounts.Shortlisted ??
                0;
        } catch (error) {
            showMessage(`Could not load dashboard statistics: ${error.message}`);
        }
    }

    async function loadOpportunities() {
        opportunitiesList.replaceChildren(
            element("div", "loading", "Loading opportunities...")
        );

        const params = new URLSearchParams();

        if (opportunityStatusFilter.value) {
            params.set("status", opportunityStatusFilter.value);
        }

        if (opportunitySearch.value.trim()) {
            params.set("search", opportunitySearch.value.trim());
        }

        try {
            const query = params.toString();
            const result = await API.get(
                `/admin/opportunities${query ? `?${query}` : ""}`
            );

            opportunities = Array.isArray(result.opportunities)
                ? result.opportunities
                : [];

            renderOpportunities();
            updateOpportunityFilter();
        } catch (error) {
            opportunitiesList.replaceChildren(
                element(
                    "div",
                    "empty-state",
                    "Unable to load opportunities. Please refresh the page."
                )
            );
            showMessage(`Could not load opportunities: ${error.message}`);
        }
    }

    function renderOpportunities() {
        opportunitiesList.replaceChildren();

        const filtered = opportunities.filter((opportunity) => {
            const statusMatches =
                !opportunityStatusFilter.value ||
                opportunity.status === opportunityStatusFilter.value;

            const search = opportunitySearch.value.trim().toLowerCase();
            const searchText = [
                opportunity.title,
                opportunity.organization,
                opportunity.location
            ].filter(Boolean).join(" ").toLowerCase();

            return statusMatches && (!search || searchText.includes(search));
        });

        if (!filtered.length) {
            opportunitiesList.append(
                element("div", "empty-state", "No matching opportunities found.")
            );
            return;
        }

        filtered.forEach((opportunity) => {
            const card = element("article", "admin-item-card");
            const header = element("div", "admin-item-header");
            const details = element("div", "");
            const title = element("h3", "", opportunity.title);
            const organization = element(
                "p",
                "muted-text",
                opportunity.organization || "Organization not specified"
            );

            details.append(title, organization);
            header.append(details, statusBadge(opportunity.status));

            const metadata = element("div", "application-details");
            metadata.append(
                element("span", "", `Type: ${opportunity.opportunityType || "Internship"}`),
                element("span", "", `Deadline: ${formatDate(opportunity.deadline)}`),
                element("span", "", `Location: ${opportunity.location || "Not specified"}`),
                element("span", "", `Minimum graduation: ${opportunity.minimumGraduationYear ?? "Any"}`),
                element("span", "", `Maximum graduation: ${opportunity.maximumGraduationYear ?? "Any"}`),
                element("span", "", `Minimum CGPA: ${opportunity.minimumCGPA ?? "Not specified"}`)
            );

            const actions = element("div", "actions admin-actions");

            addButton(actions, "Edit", "btn btn-secondary", () => {
                openOpportunityForm(opportunity);
            });

            if (opportunity.status === "draft") {
                addButton(actions, "Publish", "btn btn-primary", () => {
                    updateOpportunityStatus(opportunity, "active");
                });
            } else if (opportunity.status === "active") {
                addButton(actions, "Close", "btn btn-secondary", () => {
                    updateOpportunityStatus(opportunity, "closed");
                });
            } else if (opportunity.status === "closed") {
                addButton(actions, "Reopen", "btn btn-primary", () => {
                    updateOpportunityStatus(opportunity, "active");
                });
            }

            if (opportunity.status !== "archived") {
                addButton(actions, "Archive", "btn btn-secondary", () => {
                    archiveOpportunity(opportunity);
                });
            }

            card.append(header, metadata, actions);
            opportunitiesList.append(card);
        });
    }

    function updateOpportunityFilter() {
        const currentValue = applicationOpportunityFilter.value;

        applicationOpportunityFilter.replaceChildren();
        const firstOption = element("option", "", "All opportunities");
        firstOption.value = "";
        applicationOpportunityFilter.append(firstOption);

        opportunities.forEach((opportunity) => {
            const option = element(
                "option",
                "",
                `${opportunity.title} — ${opportunity.organization || "Organization"}`
            );
            option.value = opportunity._id;
            applicationOpportunityFilter.append(option);
        });

        applicationOpportunityFilter.value = currentValue;
    }

    function openOpportunityForm(opportunity = null) {
        const editing = Boolean(opportunity);
        const dialog = document.createElement("dialog");
        dialog.className = "application-dialog";

        const heading = element(
            "h2",
            "",
            editing ? "Edit opportunity" : "Create opportunity"
        );

        const form = document.createElement("form");
        form.className = "dialog-form";

        function createInput(labelText, name, value = "", type = "text", options = {}) {
            const group = element("div", "form-group");
            const label = element("label", "", labelText);
            const input = document.createElement(
                type === "textarea" ? "textarea" : "input"
            );

            input.name = name;
            input.id = `opportunity-${name}`;
            label.htmlFor = input.id;

            if (type === "textarea") {
                input.rows = options.rows || 4;
            } else {
                input.type = type;
            }

            input.value = value ?? "";

            if (options.required) input.required = true;
            if (options.min !== undefined) input.min = options.min;
            if (options.max !== undefined) input.max = options.max;
            if (options.step !== undefined) input.step = options.step;
            if (options.maxLength !== undefined) input.maxLength = options.maxLength;
            if (options.placeholder) input.placeholder = options.placeholder;

            group.append(label, input);
            return { group, input };
        }

        function createSelect(labelText, name, choices, value) {
            const group = element("div", "form-group");
            const label = element("label", "", labelText);
            const select = document.createElement("select");

            select.name = name;
            select.id = `opportunity-${name}`;
            label.htmlFor = select.id;

            choices.forEach(([optionValue, optionLabel]) => {
                const option = element("option", "", optionLabel);
                option.value = optionValue;
                select.append(option);
            });

            select.value = value || choices[0][0];
            group.append(label, select);
            return { group, input: select };
        }

        const title = createInput("Role title *", "title", opportunity?.title, "text", {
            required: true,
            maxLength: 150
        });

        const organization = createInput(
            "Organization *",
            "organization",
            opportunity?.organization,
            "text",
            { required: true, maxLength: 150 }
        );

        const description = createInput(
            "Description *",
            "description",
            opportunity?.description,
            "textarea",
            { required: true, maxLength: 10000 }
        );

        const type = createSelect("Opportunity type", "opportunityType", [
            ["internship", "Internship"],
            ["job", "Full-time job"]
        ], opportunity?.opportunityType);

        const location = createInput(
            "Location",
            "location",
            opportunity?.location,
            "text",
            { maxLength: 150, placeholder: "e.g. Remote, Mumbai" }
        );

        const workMode = createSelect("Work mode", "workMode", [
            ["onsite", "On-site"],
            ["hybrid", "Hybrid"],
            ["remote", "Remote"]
        ], opportunity?.workMode);

        const eligibility = createInput(
            "Eligibility requirements",
            "eligibility",
            opportunity?.eligibility,
            "textarea",
            { maxLength: 3000, rows: 3 }
        );

        const skills = createInput(
            "Required skills",
            "requiredSkills",
            Array.isArray(opportunity?.requiredSkills)
                ? opportunity.requiredSkills.join(", ")
                : "",
            "text",
            { maxLength: 1000, placeholder: "JavaScript, Node.js, MongoDB" }
        );

        const deadline = createInput(
            "Application deadline *",
            "deadline",
            opportunity?.deadline
                ? new Date(opportunity.deadline).toISOString().slice(0, 10)
                : "",
            "date",
            { required: true }
        );

        // Use the exact field names expected by the backend model and validator.
        const minGraduation = createInput(
            "Minimum graduation year",
            "minimumGraduationYear",
            opportunity?.minimumGraduationYear,
            "number",
            { min: 2000, max: 2100 }
        );

        const maxGraduation = createInput(
            "Maximum graduation year",
            "maximumGraduationYear",
            opportunity?.maximumGraduationYear,
            "number",
            { min: 2000, max: 2100 }
        );

        const minimumCGPA = createInput(
            "Minimum CGPA",
            "minimumCGPA",
            opportunity?.minimumCGPA,
            "number",
            { min: 0, max: 10, step: 0.01 }
        );

        const status = createSelect("Publication status", "status", [
            ["draft", "Draft"],
            ["active", "Active"],
            ["closed", "Closed"]
        ], opportunity?.status || "draft");

        [
            title, organization, description, type, location,
            workMode, eligibility, skills, deadline, minGraduation,
            maxGraduation, minimumCGPA, status
        ].forEach((field) => form.append(field.group));

        const message = element("p", "form-message");
        message.setAttribute("role", "status");
        message.hidden = true;

        const actions = element("div", "actions");
        const cancel = element("button", "btn btn-secondary", "Cancel");
        cancel.type = "button";

        const save = element(
            "button",
            "btn btn-primary",
            editing ? "Save changes" : "Create opportunity"
        );
        save.type = "submit";

        actions.append(cancel, save);
        form.append(message, actions);
        dialog.append(heading, form);
        document.body.append(dialog);

        cancel.addEventListener("click", () => dialog.close());
        dialog.addEventListener("close", () => dialog.remove());

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            message.hidden = true;

            const minYear = minGraduation.input.value
                ? Number(minGraduation.input.value)
                : null;

            const maxYear = maxGraduation.input.value
                ? Number(maxGraduation.input.value)
                : null;

            const cgpa = minimumCGPA.input.value
                ? Number(minimumCGPA.input.value)
                : null;

            if (minYear !== null && maxYear !== null && minYear > maxYear) {
                message.textContent =
                    "Minimum graduation year cannot exceed maximum graduation year.";
                message.className = "form-message error";
                message.hidden = false;
                return;
            }

            const payload = {
                title: title.input.value.trim(),
                organization: organization.input.value.trim(),
                description: description.input.value.trim(),
                opportunityType: type.input.value,
                location: location.input.value.trim(),
                workMode: workMode.input.value,
                eligibility: eligibility.input.value.trim(),
                requiredSkills: skills.input.value
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean),
                deadline: deadline.input.value,
                minimumGraduationYear: minYear,
                maximumGraduationYear: maxYear,
                minimumCGPA: cgpa,
                status: status.input.value
            };

            save.disabled = true;
            save.textContent = "Saving...";

            try {
                if (editing) {
                    await API.patch(
                        `/admin/opportunities/${opportunity._id}`,
                        payload
                    );
                } else {
                    await API.post("/admin/opportunities", payload);
                }

                dialog.close();
                showMessage(
                    editing
                        ? "Opportunity updated successfully."
                        : "Opportunity created successfully.",
                    "success"
                );

                await Promise.all([
                    loadDashboardStats(),
                    loadOpportunities(),
                    loadApplications()
                ]);
            } catch (error) {
                message.textContent =
                    error.message || "Unable to save the opportunity.";
                message.className = "form-message error";
                message.hidden = false;
            } finally {
                save.disabled = false;
                save.textContent = editing
                    ? "Save changes"
                    : "Create opportunity";
            }
        });

        dialog.showModal();
    }

    async function updateOpportunityStatus(opportunity, status) {
        const actionLabel = status === "active"
            ? "publish or reopen"
            : "close";

        if (!window.confirm(
            `Are you sure you want to ${actionLabel} this opportunity?`
        )) {
            return;
        }

        clearMessage();

        try {
            await API.patch(`/admin/opportunities/${opportunity._id}`, {
                status
            });

            showMessage("Opportunity status updated.", "success");

            await Promise.all([
                loadDashboardStats(),
                loadOpportunities(),
                loadApplications()
            ]);
        } catch (error) {
            showMessage(error.message || "Unable to update opportunity status.");
        }
    }

    async function archiveOpportunity(opportunity) {
        if (!window.confirm(`Archive "${opportunity.title}"?`)) return;

        clearMessage();

        try {
            // Backend archives opportunities with DELETE /opportunities/:id.
            await API.delete(`/admin/opportunities/${opportunity._id}`);

            showMessage("Opportunity archived successfully.", "success");

            await Promise.all([
                loadDashboardStats(),
                loadOpportunities(),
                loadApplications()
            ]);
        } catch (error) {
            showMessage(error.message || "Unable to archive opportunity.");
        }
    }

    async function loadApplications() {
        applicationsList.replaceChildren(
            element("div", "loading", "Loading applications...")
        );

        const params = new URLSearchParams();

        if (applicationStatusFilter.value) {
            params.set("status", applicationStatusFilter.value);
        }

        if (applicationOpportunityFilter.value) {
            params.set("opportunityId", applicationOpportunityFilter.value);
        }

        if (applicationSearch.value.trim()) {
            params.set("search", applicationSearch.value.trim());
        }

        try {
            const query = params.toString();
            const result = await API.get(
                `/admin/applications${query ? `?${query}` : ""}`
            );

            applications = Array.isArray(result.applications)
                ? result.applications
                : [];

            renderApplications();
        } catch (error) {
            applicationsList.replaceChildren(
                element(
                    "div",
                    "empty-state",
                    "Unable to load applications. Please refresh the page."
                )
            );
            showMessage(`Could not load applications: ${error.message}`);
        }
    }

    function renderApplications() {
        applicationsList.replaceChildren();

        const search = applicationSearch.value.trim().toLowerCase();

        const filtered = applications.filter((application) => {
            const opportunity = getOpportunity(application);
            const student = getStudent(application);

            const matchesStatus =
                !applicationStatusFilter.value ||
                application.status === applicationStatusFilter.value;

            const matchesOpportunity =
                !applicationOpportunityFilter.value ||
                String(getOpportunityId(application)) ===
                    applicationOpportunityFilter.value;

            const searchableText = [
                student.fullName,
                student.email,
                opportunity.title,
                opportunity.organization
            ].filter(Boolean).join(" ").toLowerCase();

            return (
                matchesStatus &&
                matchesOpportunity &&
                (!search || searchableText.includes(search))
            );
        });

        if (!filtered.length) {
            applicationsList.append(
                element("div", "empty-state", "No matching applications found.")
            );
            return;
        }

        filtered.forEach((application) => {
            const card = element("article", "admin-item-card");
            const opportunity = getOpportunity(application);
            const student = getStudent(application);

            const header = element("div", "admin-item-header");
            const details = element("div", "");
            const title = element("h3", "", opportunity.title || "Opportunity");
            const studentName = element(
                "p",
                "muted-text",
                `${student.fullName || "Student"}${student.email ? ` · ${student.email}` : ""}`
            );

            details.append(title, studentName);
            header.append(details, statusBadge(application.status));

            const metadata = element("div", "application-details");
            metadata.append(
                element("span", "", `Organization: ${opportunity.organization || "Not specified"}`),
                element("span", "", `Applied: ${formatDate(application.createdAt)}`),
                element("span", "", `Resume: ${application.resumeUrl ? "Available" : "Not provided"}`)
            );

            if (application.resumeUrl) {
                const resumeLink = element("a", "btn btn-secondary", "Open resume");
                resumeLink.href = application.resumeUrl;
                resumeLink.target = "_blank";
                resumeLink.rel = "noopener noreferrer";
                metadata.append(resumeLink);
            }

            const reviewForm = document.createElement("form");
            reviewForm.className = "admin-review-form";

            const statusGroup = element("div", "form-group");
            const statusLabel = element("label", "", "Update status");
            const statusSelect = document.createElement("select");
            statusSelect.name = "status";

            [
                "Submitted",
                "Under Review",
                "Shortlisted",
                "Rejected",
                "Selected"
            ].forEach((value) => {
                const option = element("option", "", value);
                option.value = value;
                statusSelect.append(option);
            });

            statusSelect.value = application.status || "Submitted";
            statusSelect.id = `status-${application._id}`;
            statusLabel.htmlFor = statusSelect.id;
            statusGroup.append(statusLabel, statusSelect);

            const noteGroup = element("div", "form-group");
            const noteLabel = element("label", "", "Reviewer notes");
            const note = document.createElement("textarea");
            note.name = "reviewerNote";
            note.rows = 2;
            note.maxLength = 2000;
            note.value = application.reviewerNote || "";
            note.id = `review-note-${application._id}`;
            noteLabel.htmlFor = note.id;
            note.placeholder = "Optional internal review notes";
            noteGroup.append(noteLabel, note);

            const saveButton = element("button", "btn btn-primary", "Save review");
            saveButton.type = "submit";
            reviewForm.append(statusGroup, noteGroup, saveButton);

            reviewForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                saveButton.disabled = true;
                saveButton.textContent = "Saving...";

                try {
                    // Backend uses PATCH /applications/:id.
                    await API.patch(`/admin/applications/${application._id}`, {
                        status: statusSelect.value,
                        reviewerNote: note.value.trim()
                    });

                    showMessage("Application review updated.", "success");

                    await Promise.all([
                        loadDashboardStats(),
                        loadApplications()
                    ]);
                } catch (error) {
                    showMessage(error.message || "Unable to update application.");
                } finally {
                    saveButton.disabled = false;
                    saveButton.textContent = "Save review";
                }
            });

            card.append(header, metadata);

            if (application.coverNote) {
                const coverNote = element("p", "application-note");
                coverNote.append(
                    element("strong", "", "Student cover note: "),
                    document.createTextNode(application.coverNote)
                );
                card.append(coverNote);
            }

            card.append(reviewForm);
            applicationsList.append(card);
        });
    }

    createOpportunityButton.addEventListener("click", () => {
        openOpportunityForm();
    });

    opportunityStatusFilter.addEventListener("change", loadOpportunities);
    applicationStatusFilter.addEventListener("change", loadApplications);
    applicationOpportunityFilter.addEventListener("change", loadApplications);

    let opportunitySearchTimer;
    opportunitySearch.addEventListener("input", () => {
        clearTimeout(opportunitySearchTimer);
        opportunitySearchTimer = setTimeout(loadOpportunities, 250);
    });

    let applicationSearchTimer;
    applicationSearch.addEventListener("input", () => {
        clearTimeout(applicationSearchTimer);
        applicationSearchTimer = setTimeout(loadApplications, 250);
    });

    async function initializeDashboard() {
        await Promise.all([
            loadDashboardStats(),
            loadOpportunities(),
            loadApplications()
        ]);
    }

    initializeDashboard();
});
