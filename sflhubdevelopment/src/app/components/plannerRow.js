export default function PlannerRow({ children }) {
  return (
    <div className="flex min-w-max items-stretch border-b border-green-950/10 last:border-b-0">
      {children}
    </div>
  );
}
