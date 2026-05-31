/**
 * admin.js — alphinium forge project admin check
 *
 * "Admin" in the alphinium-app template means the person who owns/operates
 * the forge project — the alphinium platform user — NOT an end-user of the app.
 *
 * Gate: set EXPO_PUBLIC_ADMIN_EMAILS to a comma-separated list of email
 * addresses in your pods.yml (or .env) before building. Any logged-in user
 * whose email is in that list will be treated as a project admin and gain
 * access to the Add-ons screen.
 *
 * Example pods.yml env var:
 *   - name: EXPO_PUBLIC_ADMIN_EMAILS
 *     value: "you@example.com,partner@example.com"
 *
 * If EXPO_PUBLIC_ADMIN_EMAILS is not set, no one sees the admin-gated screens
 * (safe default for production).
 */

const RAW = process.env.EXPO_PUBLIC_ADMIN_EMAILS || '';

const ADMIN_EMAILS = RAW
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * isProjectAdmin(user) — returns true if the authenticated Strapi user is
 * in the EXPO_PUBLIC_ADMIN_EMAILS list.
 *
 * @param {object|null} user  The user object from useAuth()
 * @returns {boolean}
 */
export function isProjectAdmin(user) {
  if (!user?.email) return false;
  if (ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
