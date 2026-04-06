"use client";
import { useState } from "react";
import Dashboard from "./dashboard/page";
import Login from "./login/page";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      {isLoggedIn ? <Dashboard /> : <Login />}
    </div>
  );
}
