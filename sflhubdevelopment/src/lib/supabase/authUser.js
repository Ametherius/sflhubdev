import { parse } from "cookie";

/** True for Supabase auth lock races (Strict Mode / parallel hook mounts). */
export function isAuthLockError(err) {
  const name = err?.name ?? "";
  const msg = String(err?.message ?? err ?? "");
  return (
    name === "AbortError" ||
    /lock.*steal|steal.*lock|orphaned lock|navigator lock/i.test(msg)
  );
}

/** Cookie session not readable yet, or wiped by an overlapping auth call. */
export function isAuthSessionMissingError(err) {
  const name = err?.name ?? "";
  const msg = String(err?.message ?? err ?? "");
  return (
    name === "AuthSessionMissingError" || /auth session missing/i.test(msg)
  );
}

const inflight = new Map();

function share(key, fn) {
  if (typeof window === "undefined") return fn();
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = fn().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/**
 * Who is signed in.
 * In the browser this reads the cookie already stored for this tab.
 * It does not call getSession(), which would refresh the login and race
 * the middleware refresh.
 * On the server it verifies the user with Supabase Auth.
 */
export async function getAuthUser(supabase) {
  if (typeof window === "undefined") {
    return readServerUser(supabase);
  }
  return share("browser-session", () => Promise.resolve(readBrowserSession()));
}

async function readServerUser(supabase) {
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user ?? null, error: error ?? null, aborted: false };
  } catch (err) {
    if (isAuthLockError(err)) {
      return { user: null, error: null, aborted: true };
    }
    throw err;
  }
}

function authCookieName() {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    return `sb-${host.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

function stringFromBase64URL(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sessionFromRaw(raw) {
  if (!raw) return null;
  const json = raw.startsWith("base64-")
    ? stringFromBase64URL(raw.slice("base64-".length))
    : raw;
  let session = JSON.parse(json);
  if (typeof session === "string") session = JSON.parse(session);
  return session;
}

/** Cookie may hold only the access token. The user id is the JWT `sub` claim. */
function userFromSession(session) {
  if (session?.user?.id && !session.user.__isUserNotAvailableProxy) {
    return session.user;
  }
  const token = session?.access_token;
  if (typeof token !== "string") return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  const claims = JSON.parse(stringFromBase64URL(payload));
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: claims.email ?? null,
    role: claims.role ?? null,
  };
}

function readBrowserSession() {
  try {
    const key = authCookieName();
    if (!key) return { user: null, error: null, aborted: false };

    const cookies = parse(document.cookie ?? "");
    const rawValues = [];
    if (cookies[key]) rawValues.push(cookies[key]);
    const chunks = [];
    for (let i = 0; ; i++) {
      const chunk = cookies[`${key}.${i}`];
      if (!chunk) break;
      chunks.push(chunk);
    }
    if (chunks.length > 0) rawValues.push(chunks.join(""));

    for (const raw of rawValues) {
      try {
        const user = userFromSession(sessionFromRaw(raw));
        if (user?.id) return { user, error: null, aborted: false };
      } catch {
        // Try the next cookie shape. A stale chunk must not hide a valid one.
      }
    }
    return { user: null, error: null, aborted: false };
  } catch (err) {
    return { user: null, error: err, aborted: false };
  }
}
