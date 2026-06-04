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
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isAuthLockError(error)) {
      return { user: null, error: null, aborted: true };
    }
    return { user: data?.user ?? null, error: error ?? null, aborted: false };
  } catch (err) {
    if (isAuthLockError(err)) {
      return { user: null, error: null, aborted: true };
    }
    throw err;
  }
}
