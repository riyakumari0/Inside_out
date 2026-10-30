// Small fetch wrapper for the Django API: sends the session cookie and CSRF token,
// and turns Django REST Framework errors into readable messages.

const readCookie = (name) => document.cookie.split('; ').find(c => c.startsWith(`${name}=`))?.split('=')[1];

export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

const messageFrom = (data, status) => {
    if (!data) {
        if (status >= 500) return 'The server had a problem. Please try again.';
        if (status === 403) return 'Your session expired or this request was blocked. Refresh the page and try again.';
        return 'Something went wrong.';
    }
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === 'string') return first;
    return 'Please check the form and try again.';
};

export const ensureCsrf = () => fetch('/api/auth/csrf/', { credentials: 'same-origin' });

export const api = async (path, { method = 'GET', body, form } = {}) => {
    const headers = {};
    if (method !== 'GET') {
        if (!readCookie('csrftoken')) await ensureCsrf();
        headers['X-CSRFToken'] = decodeURIComponent(readCookie('csrftoken') ?? '');
    }
    let payload;
    if (form) {
        payload = form; // FormData: the browser sets the multipart boundary
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
    } catch {
        throw new ApiError("Can't reach the server. Is the backend running?", 0);
    }

    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const message = response.status === 429 ? "You've hit today's limit for this. Try again later." : messageFrom(data, response.status);
        throw new ApiError(message, response.status, data);
    }
    return data;
};

// Lists like colours/tags travel as JSON strings inside multipart uploads
export const toFormData = (fields) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined) return;
        if (value instanceof Blob) form.append(key, value, 'photo.jpg');
        else if (Array.isArray(value)) form.append(key, JSON.stringify(value));
        else if (value === null) form.append(key, '');
        else form.append(key, String(value));
    });
    return form;
};
