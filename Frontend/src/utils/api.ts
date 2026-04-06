const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error('VITE_API_URL is not set. Create a .env.development file.');
}

export const API = API_BASE;
export const STATIC_BASE = API_BASE.replace(/\/api\/?$/, '') + '/';