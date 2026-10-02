"use client";

import { usePathname } from "next/navigation";
import Header from "./header";

const HIDE_HEADER_PATHS = new Set(["/", "/login"]);

export default function AppShell({ children }) {
  const pathname = usePathname();
  const showHeader = !HIDE_HEADER_PATHS.has(pathname);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {showHeader ? <Header /> : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
