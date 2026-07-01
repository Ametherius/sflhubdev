"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import AssignedMenu from "./assignedMenu";

export default function AssignedUnitsPanel({ open, onClose, assigned }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-[100vh] w-[min(32.5rem,100vw)] flex-col overflow-hidden border-l-2 border-green-950 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Assigned units"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-0 right-0 z-20 m-3 cursor-pointer text-2xl text-green-950"
          onClick={onClose}
          aria-label="Close assigned units"
        >
          <FaTimes />
        </button>
        <AssignedMenu assigned={assigned} />
      </div>
    </div>,
    document.body,
  );
}
