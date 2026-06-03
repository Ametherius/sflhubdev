"use client";

import ButtonDark from "./buttonDark";

/**
 * In-app confirmation dialog (replaces window.confirm for reliable dismiss).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
      : undefined;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="mb-2 text-lg font-bold">
          {title}
        </h2>
        <p
          id="confirm-dialog-message"
          className="mb-6 text-sm leading-relaxed text-green-900/85"
        >
          {message}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          {variant === "danger" ? (
            <button
              type="button"
              className={confirmBtnClass}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          ) : (
            <ButtonDark type="button" text={confirmLabel} onClick={onConfirm} />
          )}
        </div>
      </div>
    </div>
  );
}
