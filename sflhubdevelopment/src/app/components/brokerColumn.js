"use client";

import { useState } from "react";

export default function BrokerColumn({ brokers }) {
  const [selectedBrokers, setSelectedBrokers] = useState("Aggrocorp");
  const selectedBroker = brokers.filter((b) => {
    return b.name.toLowerCase().includes(selectedBrokers.toLowerCase());
  });
  return (
    <div className="flex flex-col w-80">
      <input
        type="search"
        value={selectedBrokers}
        onChange={(e) => setSelectedBrokers(e.target.value)}
      />
      <div className="border-2 border-green-950 bg-white text-green-950 p-3 rounded-xl">
        {selectedBroker.map((b) => (
          <div
            key={b.id}
            className="border border-green-950 bg-white text-green-950 p-2"
          >
            <h4>{b.name}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}
