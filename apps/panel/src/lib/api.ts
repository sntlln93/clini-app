import axios from 'axios';

export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
    withCredentials: true,
    withXSRFToken: true,
});

export function refreshCsrfCookie() {
    return api.get('/sanctum/csrf-cookie', {
        baseURL: import.meta.env.VITE_API_URL,
    });
}
