"use client";

import { createContext, useContext, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";

const PermissionsContext = createContext({
  loading: true,
  isAdmin: false,
  canEdit: false,
});

export function PermissionsProvider({ children }) {
  const [profile, loading] = useProfile();
  const isAdmin = Boolean(profile?.admin);

  const value = useMemo(
    () => ({
      loading,
      isAdmin,
      canEdit: isAdmin,
    }),
    [loading, isAdmin],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
