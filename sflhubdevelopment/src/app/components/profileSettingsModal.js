"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ButtonDark from "./buttonDark";

const inputClass =
  "w-full rounded-lg border-2 border-green-950 p-2 font-bold text-green-950";

export default function ProfileSettingsModal({ open, onClose }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
    setSaving(false);

    let cancelled = false;
    setLoadingProfile(true);

    (async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !user) {
        setName("");
        setLoadingProfile(false);
        setError(userError?.message ?? "You must be signed in.");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileError) {
        setError(profileError.message);
        setName("");
      } else {
        setName(data?.first_name ?? "");
      }
      setLoadingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const changingPassword =
      currentPassword || newPassword || confirmPassword;
    if (changingPassword) {
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
      if (newPassword === currentPassword) {
        setError("New password must be different from the current password.");
        return;
      }
      if (!currentPassword) {
        setError("Enter your current password to change it.");
        return;
      }
    }

    setSaving(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError(userError?.message ?? "You must be signed in.");
      return;
    }

    const { error: nameError } = await supabase
      .from("profiles")
      .update({ first_name: trimmedName })
      .eq("id", user.id);

    if (nameError) {
      setSaving(false);
      setError(nameError.message);
      return;
    }

    if (changingPassword) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        setSaving(false);
        setError("Current password is incorrect. Name was saved.");
        router.refresh();
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setSaving(false);
        setError(`${updateError.message} Name was saved.`);
        router.refresh();
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSaving(false);
    setSuccess(
      changingPassword ? "Profile and password updated." : "Name updated.",
    );
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2
          id="profile-settings-title"
          className="mb-4 text-center text-lg font-bold"
        >
          Profile Settings
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col text-sm font-medium" htmlFor="profile-name">
            Name
            <input
              id="profile-name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              disabled={loadingProfile || saving}
              required
            />
          </label>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-green-900/60">
            Change password
          </p>
          <label className="flex flex-col text-sm font-medium">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col text-sm font-medium">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col text-sm font-medium">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error ? (
            <p className="text-center text-sm font-bold text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="text-center text-sm font-bold text-green-800">
              {success}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
              onClick={onClose}
            >
              Close
            </button>
            <ButtonDark
              type="submit"
              text={saving ? "Saving…" : "Save"}
              disabled={saving || loadingProfile}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
