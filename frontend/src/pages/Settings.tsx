export default function SettingsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      <div className="card p-5 bg-white shadow-sm border border-surface-200">
        <h2 className="text-surface-900 font-bold text-base mb-4">Application & Operational Settings</h2>
        <div className="space-y-3">
          {[
            { label: 'Intelligence Engine', value: 'Spatial Multi-Well Haversine & Lithology Correlator', desc: 'Active Duliajan offset risk synthesis engine (SIH Problem Statement 26121)', badge: 'badge-normal' },
            { label: 'OCR Extraction', value: 'Structured Pattern & RegEx Parser', desc: 'Automated entity extraction from historical Daily Drilling Reports (DDR) and Well Completion Reports', badge: 'badge-info' },
            { label: 'Geographic Area', value: 'Duliajan, Upper Assam Basin (India)', desc: 'Operational bounds: Lat 27.2°N - 27.6°N, Long 95.1°E - 95.5°E', badge: 'badge-normal' },
            { label: 'Database & API', value: 'SQLite / REST API (Connected)', desc: 'Backend service active at localhost:3001/api', badge: 'badge-info' },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-4 p-3.5 bg-surface-50 rounded-lg border border-surface-200/80">
              <div className="flex-1">
                <div className="text-2xs font-bold uppercase tracking-wider text-surface-500 mb-0.5">{s.label}</div>
                <div className="text-surface-900 font-semibold text-sm">{s.value}</div>
                <div className="text-xs text-surface-500 mt-0.5">{s.desc}</div>
              </div>
              <span className={`badge ${s.badge}`}>
                Configured
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-3.5 bg-white shadow-2xs border border-surface-200">
        <div className="text-xs text-surface-500 leading-relaxed">
          <strong className="text-surface-800">SIH 2026 Prototype v1.0</strong> — eRTMAC-NWIS Nearby Wells Intelligence System<br />
          Problem Statement 26121 · Oil India Limited · Designed for drilling engineers, geologists, and management.
        </div>
      </div>
    </div>
  );
}
