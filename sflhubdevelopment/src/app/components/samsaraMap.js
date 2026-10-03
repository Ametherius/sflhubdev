"use client";

import dynamic from "next/dynamic";

const SamsaraClient = dynamic(() => import("./samsaraClient"), {
  ssr: false,
});

export default function SamsaraMap({ units, drivers }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <SamsaraClient units={units} drivers={drivers} />
    </div>
  );
}
