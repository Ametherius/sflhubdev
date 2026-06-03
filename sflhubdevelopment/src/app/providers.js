"use client";

import { ConfirmProvider } from "@/context/confirmContext";

export default function Providers({ children }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
