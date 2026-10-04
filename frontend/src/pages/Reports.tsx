export default function ReportsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      <div className="card p-10 text-center bg-white shadow-sm border border-surface-200">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-surface-900 text-lg font-bold mb-2">Drilling & Offset Intelligence Reports</div>
        <div className="text-surface-500 text-sm max-w-md mx-auto leading-relaxed">
          Generate PDF/Excel operational reports including daily drilling logs (DDR), offset risk summaries, formation correlations, and geological knowledge exports.
        </div>
        <div className="mt-4 badge badge-normal text-2xs font-semibold">Available for Export</div>
      </div>
    </div>
  );
}
