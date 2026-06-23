"use client";

import { ConfirmProvider } from "@/context/confirmContext";
import { PermissionsProvider } from "@/context/permissionsContext";

export default function Providers({ children }) {
  return (
    <ConfirmProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </ConfirmProvider>
  );
}
