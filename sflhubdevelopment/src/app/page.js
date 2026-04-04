"use client";

import Image from "next/image";
import Header from "./components/header";
import { useState } from "react";
import Dashboard from "./dashboard/page";
import Login from "./login/page";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return (
    <div className="bg-black">{isLoggedIn ? <Dashboard /> : <Login />}</div>
  );
}
