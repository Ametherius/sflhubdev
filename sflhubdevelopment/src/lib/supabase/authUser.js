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

function readCookie(name) {
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = decodeURIComponent(part.slice(0, eq));
    if (key !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

function stringFromBase64URL(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readBrowserSession() {
  try {
    const key = authCookieName();
    if (!key) return { user: null, error: null, aborted: false };

    let raw = readCookie(key);
    if (!raw) {
      const chunks = [];
      for (let i = 0; ; i++) {
        const chunk = readCookie(`${key}.${i}`);
        if (!chunk) break;
        chunks.push(chunk);
      }
      raw = chunks.length > 0 ? chunks.join("") : null;
    }
    if (!raw) return { user: null, error: null, aborted: false };

    const json = raw.startsWith("base64-")
      ? stringFromBase64URL(raw.slice("base64-".length))
      : raw;
    const session = JSON.parse(json);
    const user = session?.user?.id ? session.user : null;
    return { user, error: null, aborted: false };
  } catch (err) {
    return { user: null, error: err, aborted: false };
  }
}
