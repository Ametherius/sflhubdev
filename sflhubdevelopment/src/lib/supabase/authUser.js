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

function isRetryableAuthError(err) {
  return isAuthLockError(err) || isAuthSessionMissingError(err);
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
 * In the browser this reads the cookie session once and shares that result,
 * so the schedule hooks do not each make a network auth call.
 * On the server it verifies the user with Supabase Auth.
 */
export async function getAuthUser(supabase) {
  if (typeof window === "undefined") {
    return readServerUser(supabase);
  }
  return share("browser-session", () => readBrowserSession(supabase));
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

async function readBrowserSession(supabase) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session?.user) {
        return { user: data.session.user, error: null, aborted: false };
      }
      lastError = error ?? null;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      return { user: null, error: lastError, aborted: false };
    } catch (err) {
      lastError = err;
      if (isRetryableAuthError(err) && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      if (isAuthLockError(err)) {
        return { user: null, error: null, aborted: true };
      }
      throw err;
    }
  }

  return { user: null, error: lastError, aborted: false };
}
