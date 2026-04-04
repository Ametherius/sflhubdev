"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schedule", href: "/schedule" },
];

function HeaderTitle() {
  return (
    <div className="bg-gray-500 text-center p-3">
      <h1 className="font-bold text-3xl">SFL Dispatch Hub</h1>
    </div>
  );
}

function Navbar() {
  const pathname = usePathname();
  return (
    <div className="bg-black flex">
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
    <div className="bg-gray-800">
      <HeaderTitle />
      <Navbar />
    </div>
  );
}
