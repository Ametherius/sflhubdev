export default function Modal({ children, className = "" }) {
  return <div className={`bg-white w-fit ${className}`}>{children}</div>;
}
