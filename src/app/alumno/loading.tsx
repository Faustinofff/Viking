export default function AlumnoLoading() {
  return (
    <div className="p-5 max-w-lg mx-auto space-y-4">
      <div className="w-32 h-6 rounded-lg bg-white/[0.06] animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        <div className="card h-20 animate-pulse" />
        <div className="card h-20 animate-pulse" />
        <div className="card h-20 animate-pulse" />
      </div>
      <div className="card h-32 animate-pulse" />
      <div className="card h-40 animate-pulse" />
    </div>
  );
}