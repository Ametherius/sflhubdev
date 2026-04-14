"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schedule", href: "/schedule" },
];

function HeaderTitle() {
  return (
    <div className="bg-gray-500 text-center my-auto py-auto p-3 w-full grid grid-cols-3">
      <div className=""></div>
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

export default function Header() {
  return (
    <div className="bg-gray-800 w-full">
      <HeaderTitle />
      <Navbar />
    </div>
  );
}
