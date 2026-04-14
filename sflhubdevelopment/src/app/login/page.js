"use client";
import { FaEnvelope } from "react-icons/fa";
import Image from "next/image";
import { FaUser } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
import CircleIcon from "../components/circleIcon";
import BtnWhite from "../components/btnWhite";
import { FaCheck } from "react-icons/fa";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
  };
  return (
    <div className="w-screen h-screen bg-linear-to-br backdrop-blur-sm from-green-900 to-green-950 flex relative justify-center items-center">
      <Image
        src="/images/logo-transparent.png"
        width={700}
        height={700}
        alt="SFL Logo"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 m-3 z-0 opacity-40"
      />
      <div className="p-5 flex flex-col items-center">
        <CircleIcon Icon={FaUser} className="z-10" />
        <h2 className="text-white font-bold text-center text-3xl my-6">
          Sign In
        </h2>
        <form className="flex flex-col z-10" onSubmit={handleLogin}>
          <div className="flex h-14 mb-3">
            <div className="bg-white text-3xl border-2 border-green-950 text-green-950 p-3">
              <FaEnvelope />
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-center border-2 text-green-950 border-green-950 p-6 bg-white"
            />
          </div>
          <div className="flex h-14 mb-3">
            <div className="bg-white text-3xl border-2 border-green-950 text-green-950 p-3">
              <FaLock />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center border-2 border-green-950 text-green-950 p-6 bg-white"
            />
          </div>
          <div className="flex justify-center">
            <BtnWhite text="Login" type="submit" Icon={FaCheck} />
          </div>
          {error && <p className="text-red font-bold text-cener">{error}</p>}
        </form>
      </div>
    </div>
  );
}
