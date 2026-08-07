"use client";

import { ConfirmProvider } from "@/context/confirmContext";
import { PermissionsProvider } from "@/context/permissionsContext";

export default function Providers({ children }) {
  return (
    <ConfirmProvider>
      <PermissionsProvider>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </PermissionsProvider>
    </ConfirmProvider>
  );
}
