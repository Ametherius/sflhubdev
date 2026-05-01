export default function Modal({ children }) {
  return (
    <div className="bg-white w-fit absolute top-1/2 left-1/2 transform -x-translate-1/2 -y-translate-1/2">
      {children}
    </div>
  );
}
