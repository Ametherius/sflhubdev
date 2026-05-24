import { useState } from "react";
import FormInput from "./formInput";

export default function CattleLoadsheet() {
  const [loadNumber, setLoadNumber] = useState("");
  const [rate, setRate] = useState("");
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [broker, setBroker] = useState("");

  const inputStyle = `placeholder:text-green-950 rounded-xl border border-green-950 p-2 m-2`;

  return (
    <div>
      <h2 className="text-green-950 text-2xl p-2 text-center font-bold">
        New Cattle Loadsheet
      </h2>
      <form>
        <div className="grid grid-cols-2">
          <input
            type="text"
            placeholder="Load Number"
            value={loadNumber}
            onChange={(e) => setLoadNumber(e.target.value)}
            className={inputStyle}
          />
          <input
            type="text"
            className={inputStyle}
            placeholder="Broker"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1">
          <input
            type="text"
            className={inputStyle}
            value={origin}
            placeholder="Origin"
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1">
          <input
            type="text"
            className={inputStyle}
            value={endUser}
            placeholder="End User"
            onChange={(e) => setEndUser(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1">
          <input
            type="text"
            className={inputStyle}
            value={rate}
            placeholder="Rate"
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </form>
    </div>
  );
}
