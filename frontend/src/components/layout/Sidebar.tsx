import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Map, BookOpen,
  FileText, GitCompare, Layers, AlertTriangle, Bell,
  Lightbulb, BarChart3, Settings, Droplets,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Operations
  { path: '/dashboard',         label: 'Dashboard',            icon: <LayoutDashboard size={15} />, group: 'MAIN' },
  { path: '/active-well',       label: 'Active Well',           icon: <Activity size={15} />,        group: 'MAIN' },
  { path: '/nearby-wells',      label: 'Nearby Wells Map',      icon: <Map size={15} />,             group: 'MAIN' },
  // Knowledge & Data
  { path: '/knowledge',         label: 'Knowledge Repository',  icon: <BookOpen size={15} />,        group: 'KNOWLEDGE' },
  { path: '/documents',         label: 'Document Intelligence', icon: <FileText size={15} />,        group: 'KNOWLEDGE' },
  { path: '/comparison',        label: 'Well Comparison',       icon: <GitCompare size={15} />,      group: 'KNOWLEDGE' },
  { path: '/correlation',       label: 'Formation Correlation', icon: <Layers size={15} />,          group: 'KNOWLEDGE' },
  // Risk & Alerts
  { path: '/risk-intelligence', label: 'Risk Intelligence',     icon: <AlertTriangle size={15} />,   group: 'INTELLIGENCE' },
  { path: '/alerts',            label: 'Alerts',                icon: <Bell size={15} />,            group: 'INTELLIGENCE' },
  { path: '/recommendations',   label: 'AI Recommendations',    icon: <Lightbulb size={15} />,       group: 'INTELLIGENCE' },
  // Reports
  { path: '/reports',           label: 'Reports',               icon: <BarChart3 size={15} />,       group: 'REPORTS' },
  { path: '/settings',          label: 'Settings',              icon: <Settings size={15} />,        group: 'REPORTS' },
];

const GROUPS = [
  { key: 'MAIN',         label: 'Operations' },
  { key: 'KNOWLEDGE',    label: 'Knowledge & Data' },
  { key: 'INTELLIGENCE', label: 'Risk & Alerts' },
  { key: 'REPORTS',      label: 'Reports' },
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-surface-200 flex flex-col h-screen sticky top-0 shadow-sm z-30 select-none">
      {/* Header / Brand */}
      <div className="px-4 py-3.5 border-b border-surface-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Droplets size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-surface-900 text-sm font-bold leading-tight tracking-tight">eRTMAC-NWIS</div>
            <div className="text-primary-700 text-2xs font-semibold tracking-wide">Oil India Limited</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-amber-50/80 border border-amber-200/80 rounded text-2xs text-amber-800 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          Demo Data · SIH 2026
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-hide space-y-4">
        {GROUPS.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group.key);
          return (
            <div key={group.key}>
              <div className="px-2.5 mb-1 text-2xs font-bold uppercase tracking-wider text-surface-400">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-semibold border-l-[3px] border-primary-600 shadow-2xs'
                          : 'text-surface-700 hover:text-surface-900 hover:bg-surface-100 font-medium'
                      }`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-surface-200 bg-surface-50">
        <div className="text-2xs text-surface-600 font-semibold">SIH 2026 Prototype</div>
        <div className="text-2xs text-surface-400">PS 26121 · OIL Duliajan</div>
      </div>
    </aside>
  );
}

// Export for breadcrumbs
export { NAV_ITEMS };
