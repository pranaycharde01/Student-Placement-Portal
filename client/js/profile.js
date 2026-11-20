
document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profile-form");
    const pageMessage = document.getElementById("page-message");
    const saveButton = document.getElementById("save-button");
    const resetButton = document.getElementById("reset-button");
    const logoutButton = document.getElementById("logout-button");

    const fields = {
        fullName: document.getElementById("full-name"),
        department: document.getElementById("department"),
        graduationYear: document.getElementById("graduation-year"),
        cgpa: document.getElementById("cgpa"),
        contactNumber: document.getElementById("contact-number"),
        skills: document.getElementById("skills"),
        educationSummary: document.getElementById("education-summary"),
        portfolioUrl: document.getElementById("portfolio-url"),
        githubUrl: document.getElementById("github-url"),
        linkedInUrl: document.getElementById("linkedin-url")
    };

    let originalProfile = null;

    if (!API.requireLogin()) return;

    // Registered name cannot be edited.
    if (fields.fullName) {
        fields.fullName.readOnly = true;
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => API.logout());
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

    function setProfileValues(profile) {
        fields.fullName.value = profile.fullName || "";
        fields.department.value = profile.department || "";
        fields.graduationYear.value = profile.graduationYear ?? "";
        fields.cgpa.value = profile.cgpa ?? "";
        fields.contactNumber.value = profile.contactNumber || "";

        fields.skills.value = Array.isArray(profile.skills)
            ? profile.skills.join(", ")
            : "";

        fields.educationSummary.value = profile.educationSummary || "";
        fields.portfolioUrl.value = profile.portfolioUrl || "";
        fields.githubUrl.value = profile.githubUrl || "";
        fields.linkedInUrl.value = profile.linkedInUrl || "";
    }

    function updateProfileSummary(profile) {
        const name = profile.fullName || "Student";

        document.getElementById("profile-name").textContent = name;
        document.getElementById("profile-email").textContent =
            profile.email || "";

        document.getElementById("profile-avatar").textContent =
            name.trim().charAt(0).toUpperCase() || "S";

        document.getElementById("profile-role").textContent =
            profile.role === "admin" ? "Administrator" : "Student";
    }

    // Only editable fields are included in the update request.
    function readFormValues() {
        const graduationYearValue = fields.graduationYear.value.trim();
        const cgpaValue = fields.cgpa.value.trim();

        return {
            department: fields.department.value.trim(),

            graduationYear: graduationYearValue
                ? Number(graduationYearValue)
                : null,

            cgpa: cgpaValue ? Number(cgpaValue) : null,

            contactNumber: fields.contactNumber.value.trim(),

            skills: fields.skills.value
                .split(",")
                .map(skill => skill.trim())
                .filter(Boolean),

            educationSummary: fields.educationSummary.value.trim(),
            portfolioUrl: fields.portfolioUrl.value.trim(),
            githubUrl: fields.githubUrl.value.trim(),
            linkedInUrl: fields.linkedInUrl.value.trim()
        };
    }

    function validateProfile(profile) {
        if (
            profile.graduationYear !== null &&
            (!Number.isInteger(profile.graduationYear) ||
                profile.graduationYear < 2000 ||
                profile.graduationYear > 2100)
        ) {
            return "Enter a valid graduation year.";
        }

        if (
            profile.cgpa !== null &&
            (!Number.isFinite(profile.cgpa) ||
                profile.cgpa < 0 ||
                profile.cgpa > 10)
        ) {
            return "CGPA must be between 0 and 10.";
        }

        if (profile.skills.length > 50) {
            return "Please enter no more than 50 skills.";
        }

        return null;
    }

    async function loadProfile() {
        clearMessage();
        saveButton.disabled = true;

        try {
            const result = await API.get("/profile");
            const profile = result.profile || result.user || result;

            originalProfile = { ...profile };
            setProfileValues(profile);
            updateProfileSummary(profile);
        } catch (error) {
            showMessage(error.message || "Unable to load your profile.");
        } finally {
            saveButton.disabled = false;
        }
    }

    profileForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearMessage();

        const profile = readFormValues();
        const validationError = validateProfile(profile);

        if (validationError) {
            showMessage(validationError);
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const result = await API.patch("/profile", profile);

            const updatedProfile = result.profile || result.user || {
                ...(originalProfile || {}),
                ...profile
            };

            // Preserve the registered name from the original profile.
            if (originalProfile) {
                updatedProfile.fullName = originalProfile.fullName;
            }

            originalProfile = { ...updatedProfile };
            setProfileValues(updatedProfile);
            updateProfileSummary(updatedProfile);

            showMessage(
                "Your profile has been saved successfully.",
                "success"
            );
        } catch (error) {
            showMessage(error.message || "Unable to save your profile.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save profile";
        }
    });

    resetButton.addEventListener("click", () => {
        clearMessage();

        if (originalProfile) {
            setProfileValues(originalProfile);
        }
    });

    loadProfile();
});
