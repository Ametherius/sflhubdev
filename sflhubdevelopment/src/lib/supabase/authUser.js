/** True for Supabase auth lock races (Strict Mode / parallel hook mounts). */
export function isAuthLockError(err) {
  const name = err?.name ?? "";
  const msg = String(err?.message ?? err ?? "");
  return (
    name === "AbortError" ||
    /lock.*steal|steal.*lock|orphaned lock|navigator lock/i.test(msg)
  );
}

/** Cookie session not readable yet, or wiped by an overlapping getUser(). */
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

/**
 * getUser that waits out lock races and a cold cookie read after cache clears.
 * A missing session on the first try is often the cookie store still starting.
 */
export async function getAuthUser(supabase) {
  const maxAttempts = 4;
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        return { user: data.user, error: null, aborted: false };
      }
      lastError = error ?? null;
      if (error && isRetryableAuthError(error) && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
        continue;
      }
      return { user: data?.user ?? null, error: error ?? null, aborted: false };
    } catch (err) {
      lastError = err;
      if (isRetryableAuthError(err) && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
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
