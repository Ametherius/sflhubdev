"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { FaCog } from "react-icons/fa";
import { useUser } from "@/hooks/useUser";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schedule", href: "/schedule" },
  { label: "Load Planner", href: "/planner" },
  { label: "Samsara", href: "/samsara" },
  { label: "Motive", href: "/motive" },
];

export default function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="bg-gray-800 w-full">
      <HeaderTitle onToggle={() => setIsSettingsOpen((open) => !open)} />
      <Navbar />
      {isSettingsOpen ? (
        <SettingsMenu onClose={() => setIsSettingsOpen(false)} />
      ) : null}
    </div>
  );
}

function HeaderTitle({ onToggle }) {
  return (
    <div className="bg-gray-500 text-center my-auto py-auto p-3 w-full grid grid-cols-3">
      <div className="flex justify-start items-center">
        <button
          type="button"
          className="text-2xl hover:text-green-700 transition-all hover:scale-[1.4] hidden"
          onClick={onToggle}
          aria-label="Settings"
        >
          <FaCog />
        </button>
      </div>
      <div className="flex justify-center">
        <h1 className="font-bold text-3xl text-center text-white">
          SFL Dispatch Hub
        </h1>
      </div>
      <div className="flex justify-end">
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error: ", error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="bg-green-950 py-2 px-4 rounded-md font-bold shadow-sm hover:bg-white hover:text-green-950"
    >
      Logout
    </button>
  );
}

function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="bg-black flex w-full">
      {navLinks.map((link) => {
        const active = pathname === link.href;
        const classes = active
          ? "bg-green-800 text-white p-2"
          : "bg-black p-2 text-white hover:bg-yellow-700";

        return (
          <Link key={link.href} href={link.href} prefetch className={classes}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SettingsMenu({ onClose }) {
  const [name, setName] = useState("");
  const [activeUser] = useUser();
  const inputStyle =
    "rounded-lg font-bold border border-green-950 p-1 text-green-950";

  return (
    <div
      className="w-fit h-fit bg-white z-50 flex flex-col justify-center p-4 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <h2 id="settings-title" className="text-green-950 text-center font-bold">
        Settings
      </h2>
      {activeUser?.email ? (
        <p className="mb-2 text-center text-xs text-green-900/70">
          {activeUser.email}
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex flex-col mb-2">
          <label className="text-green-950" htmlFor="settings-name">
            Name
          </label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputStyle}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
}
