/** True for Supabase auth lock races (Strict Mode / parallel hook mounts). */
export function isAuthLockError(err) {
  const name = err?.name ?? "";
  const msg = String(err?.message ?? err ?? "");
  return (
    name === "AbortError" ||
    /lock.*steal|steal.*lock|orphaned lock|navigator lock/i.test(msg)
  );
}

/** getUser that does not throw on auth storage lock contention. */
export async function getAuthUser(supabase) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isAuthLockError(error)) {
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
          continue;
        }
        return { user: null, error: null, aborted: true };
      }
      return { user: data?.user ?? null, error: error ?? null, aborted: false };
    } catch (err) {
      if (isAuthLockError(err)) {
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
          continue;
        }
        return { user: null, error: null, aborted: true };
      }
      throw err;
    }
  }
  return { user: null, error: null, aborted: true };
}
