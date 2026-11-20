
"use strict";

const API = (() => {
    const BASE_URL = "/api";

    function getToken() {
        return sessionStorage.getItem("authToken");
    }

    function getCurrentUser() {
        try {
            const storedUser = sessionStorage.getItem("currentUser");
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    }

    function clearSession() {
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("currentUser");
    }

    function logout() {
        clearSession();
        window.location.replace("/");
    }

    async function request(endpoint, options = {}) {
        const headers = {
            ...(options.headers || {})
        };

        if (options.body !== undefined && !(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        let response;

        try {
            response = await fetch(`${BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
        } catch {
            throw new Error(
                "Unable to connect to the server. Check that the application is running."
            );
        }

        const contentType = response.headers.get("content-type") || "";
        let result = {};

        if (contentType.includes("application/json")) {
            result = await response.json().catch(() => ({}));
        }

        if (response.status === 401) {
            clearSession();

            if (window.location.pathname !== "/") {
                window.location.replace("/");
            }

            throw new Error(
                result.message || "Your session has expired. Please log in again."
            );
        }

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message || `Request failed with status ${response.status}.`
            );
        }

        return result;
    }

    function get(endpoint) {
        return request(endpoint, { method: "GET" });
    }

    function post(endpoint, data) {
        return request(endpoint, {
            method: "POST",
            body: JSON.stringify(data)
        });
    }

    function patch(endpoint, data) {
        return request(endpoint, {
            method: "PATCH",
            body: JSON.stringify(data)
        });
    }

    function put(endpoint, data) {
        return request(endpoint, {
            method: "PUT",
            body: JSON.stringify(data)
        });
    }

    function deleteRequest(endpoint) {
        return request(endpoint, { method: "DELETE" });
    }

    function requireLogin() {
        if (!getToken()) {
            window.location.replace("/");
            return false;
        }

        return true;
    }

    function requireRole(role) {
        const user = getCurrentUser();

        if (!getToken() || !user) {
            window.location.replace("/");
            return false;
        }

        if (user.role !== role) {
            window.location.replace(
                user.role === "admin" ? "/admin.html" : "/dashboard.html"
            );
            return false;
        }

        return true;
    }

    return {
        getToken,
        getCurrentUser,
        clearSession,
        logout,
        request,
        get,
        post,
        patch,
        put,
        delete: deleteRequest,
        requireLogin,
        requireRole
    };
})();
