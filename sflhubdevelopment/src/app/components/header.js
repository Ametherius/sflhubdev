"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import ProfileSettingsModal from "./profileSettingsModal";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schedule", href: "/schedule" },
  { label: "Load Planner", href: "/planner" },
  { label: "Samsara", href: "/samsara" },
];

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="bg-gray-800 w-full">
      <HeaderTitle onOpenProfile={() => setIsProfileOpen(true)} />
      <Navbar />
      <ProfileSettingsModal
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

function HeaderTitle({ onOpenProfile }) {
  return (
    <div className="bg-gray-500 text-center my-auto py-auto p-3 w-full grid grid-cols-3">
      <div className="flex justify-start items-center" />
      <div className="flex justify-center">
        <h1 className="font-bold text-3xl text-center text-white">
          SFL Dispatch Hub
        </h1>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center justify-center rounded-md p-2 text-3xl text-white transition-all hover:scale-110 hover:text-green-950"
          aria-label="Profile settings"
        >
          <FaUserCircle />
        </button>
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
