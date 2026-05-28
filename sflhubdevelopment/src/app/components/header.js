"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import BtnWhite from "./btnWhite";
import { useState } from "react";
import { FaCog } from "react-icons/fa";
import { useUser } from "@/hooks/useUser";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schedule", href: "/schedule" },
];

export default function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function toggleSettings() {
    setIsSettingsOpen(!isSettingsOpen);
  }
  return (
    <div className="bg-gray-800 w-full">
      <HeaderTitle onToggle={toggleSettings} />
      <Navbar />
      <SettingsMenu onToggle={isSettingsOpen} />
    </div>
  );
}

function HeaderTitle({ onToggle }) {
  return (
    <div className="bg-gray-500 text-center my-auto py-auto p-3 w-full grid grid-cols-3">
      <div className="flex justify-start items-center">
        <button
          className="text-2xl hover:text-green-700 transition-all hover:scale-[1.4] hidden"
          onClick={onToggle}
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
  const supabase = createClient();
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
    <div className="bg-black flex w-full">
      {navLinks.map((link) => {
        const classes =
          pathname === link.href
            ? "bg-green-800 text-white p-2"
            : "bg-black p-2 hover:bg-yellow-700";

        return (
          <Link key={link.href} href={link.href} className={classes}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

function SettingsMenu({ onToggle }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [activeUser] = useUser();
  console.log(activeUser);
  const inputStyle =
    "rounded-lg font-bold border border-green-950 p-1 text-green-950";
  return (
    <div
      className={`w-fit h-fit ${onToggle ? "" : "hidden"} bg-white z-50 flex flex-col justify-center p-4 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-xl`}
    >
      <h2 className="text-green-950 text-center font-bold">Settings</h2>
      <form>
        <div className="flex flex-col mb-2">
          <label className="text-green-950">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputStyle}
          />
        </div>
      </form>
    </div>
  );
}
