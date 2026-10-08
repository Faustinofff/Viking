export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-7 w-44 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-64 rounded-lg bg-white/[0.06] animate-pulse" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-white/[0.06] animate-pulse hidden sm:block" />
        <div className="h-10 w-10 rounded-xl bg-white/[0.06] animate-pulse sm:hidden" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-48 animate-pulse" />
        <div className="card h-48 animate-pulse" />
      </div>
    </div>
  );
}