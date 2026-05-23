import { FaCopy, FaEdit, FaTimes } from "react-icons/fa";
import BtnRed from "./btnRed";
import ButtonDark from "./buttonDark";
import BtnWhite from "./btnWhite";
import BtnWhiteRounded from "./btnWhiteRound";

export default function LoadsheetMenu({ loadsheets }) {
  const deleteIcon = `<FaTimes/>`;

  return (
    <div className="mt-10">
      {loadsheets.map((loadsheet) => (
        <div
          key={loadsheet.id}
          className="flex bg-gray-900 rounded-lg w-full p-1 py-auto mb-2 h-20"
        >
          <div className="bg-gray-900 border flex justify-center h-full items-center rounded-l-lg p-2 my-auto w-40">
            <p>{loadsheet.load_number}</p>
          </div>
          <div className="bg-gray-900 border rounded-r-lg p-2 w-full flex my-auto h-full justify-center items-center">
            <BtnRed text={<FaTimes />} type="button" />
            <ButtonDark text={<FaEdit />} type="button" />
            <BtnWhiteRounded text={<FaCopy />} type="button" />
          </div>
        </div>
      ))}
    </div>
  );
}
