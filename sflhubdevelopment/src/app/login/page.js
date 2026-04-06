"use client";
import { FaEnvelope } from "react-icons/fa";
import Image from "next/image";
import { FaUser } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
import CircleIcon from "../components/circleIcon";

export default function Login() {
  return (
    <div className="w-screen h-screen bg-gradient-to-br backdrop-blur-sm from-green-900 to-green-950 flex relative justify-center items-center">
      <Image
        src="/images/logo-transparent.png"
        width={700}
        height={700}
        alt="SFL Logo"
        className="absolute top-0 left-0 m-3"
      />
      <div className="p-5 flex flex-col items-center">
        <CircleIcon Icon={FaUser} />
        <h2 className="text-white font-bold text-center text-3xl my-6">
          Sign In
        </h2>
        <form className="flex flex-col">
          <div className="flex h-14 mb-3">
            <div className="bg-white text-3xl text-green-950 p-3">
              <FaEnvelope />
            </div>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Email"
              className="text-center border uppercase p-6"
            />
          </div>
          <div className="flex h-14 mb-3">
            <div className="bg-white text-3xl text-green-950 p-3">
              <FaLock />
            </div>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Password"
              className="text-center border uppercase p-6"
            />
          </div>
          <button type="submit" className=""></button>
        </form>
      </div>
    </div>
  );
}
