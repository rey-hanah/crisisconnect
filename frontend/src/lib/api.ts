/**
 * Central API base URL.
 *
 * In development:  set VITE_API_URL in frontend/.env  (defaults to localhost:3001)
 * In production:   set VITE_API_URL in Vercel → Project Settings → Environment Variables
 *                  e.g. https://crisisconnect-api.onrender.com
 */
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
