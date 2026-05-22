export default function LoadsheetMenu({ loadsheets }) {
  return (
    <div>
      {loadsheets.map((loadsheet) => (
        <div key={loadsheet.id} className="flex bg-gray-900">
          <div className="bg-gray-900"></div>
        </div>
      ))}
    </div>
  );
}
