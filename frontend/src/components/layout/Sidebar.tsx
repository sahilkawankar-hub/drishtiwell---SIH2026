import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Map, BookOpen,
  FileText, GitCompare, Layers, AlertTriangle, Bell,
  Lightbulb, BarChart3, Settings, Droplets,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard size={16} />,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    ],
  },
  {
    key: 'active-well',
    label: 'Active Well',
    icon: <Activity size={16} />,
    items: [
      { path: '/active-well', label: 'Well Monitor', icon: <Activity size={14} /> },
    ],
  },
  {
    key: 'well-explorer',
    label: 'Well Explorer',
    icon: <Map size={16} />,
    items: [
      { path: '/nearby-wells', label: 'Nearby Wells Map', icon: <Map size={14} /> },
    ],
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    icon: <AlertTriangle size={16} />,
    items: [
      { path: '/risk-intelligence', label: 'Risk Assessment', icon: <AlertTriangle size={14} /> },
      { path: '/alerts', label: 'Alerts', icon: <Bell size={14} /> },
      { path: '/recommendations', label: 'Recommendations', icon: <Lightbulb size={14} /> },
    ],
  },
  {
    key: 'docs-knowledge',
    label: 'Documents & Knowledge',
    icon: <FileText size={16} />,
    items: [
      { path: '/documents', label: 'Document Intelligence', icon: <FileText size={14} /> },
      { path: '/knowledge', label: 'Knowledge Search', icon: <BookOpen size={14} /> },
    ],
  },
  {
    key: 'analysis',
    label: 'Analysis & Reports',
    icon: <BarChart3 size={16} />,
    items: [
      { path: '/comparison', label: 'Well Comparison', icon: <GitCompare size={14} /> },
      { path: '/correlation', label: 'Formation Correlation', icon: <Layers size={14} /> },
      { path: '/reports', label: 'Reports', icon: <BarChart3 size={14} /> },
    ],
  },
];

// Flat list for breadcrumbs (backwards-compatible export)
const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items).concat([
  { path: '/settings', label: 'Settings', icon: <Settings size={14} /> },
]);

export function Sidebar() {
  const location = useLocation();

  // Determine which section is active based on current path
  const activeSectionKey = NAV_SECTIONS.find(s =>
    s.items.some(i => location.pathname.startsWith(i.path))
  )?.key || '';

  // Sections with more than 1 item are collapsible; auto-expand if active
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(activeSectionKey ? [activeSectionKey] : [])
  );

  function toggleSection(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-surface-200 flex flex-col h-screen sticky top-0 shadow-sm z-30 select-none">
      {/* Brand */}
      <div className="px-4 py-3.5 border-b border-surface-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Droplets size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-surface-900 text-sm font-bold leading-tight tracking-tight">DrishtiWell</div>
            <div className="text-primary-700 text-2xs font-medium">Oil India · SIH 2026</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2.5 px-2 overflow-y-auto scrollbar-hide">
        {NAV_SECTIONS.map(section => {
          const isSingleItem = section.items.length === 1;
          const isActive = section.items.some(i => location.pathname.startsWith(i.path));
          const isExpanded = expanded.has(section.key) || isActive;

          if (isSingleItem) {
            // Single-item section renders as a direct link
            const item = section.items[0];
            return (
              <NavLink
                key={section.key}
                to={item.path}
                className={({ isActive: linkActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors mb-0.5 ${
                    linkActive
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  }`
                }
              >
                <span className="shrink-0">{section.icon}</span>
                <span className="truncate">{section.label}</span>
              </NavLink>
            );
          }

          // Multi-item section with collapsible submenu
          return (
            <div key={section.key} className="mb-0.5">
              <button
                onClick={() => toggleSection(section.key)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-primary-700 bg-primary-50/50'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                }`}
              >
                <span className="shrink-0">{section.icon}</span>
                <span className="truncate flex-1 text-left">{section.label}</span>
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-surface-400 transition-transform duration-150 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-4 pl-2.5 border-l border-surface-100 mt-0.5 space-y-0.5">
                  {section.items.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive: linkActive }) =>
                        `flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                          linkActive
                            ? 'text-primary-700 font-semibold bg-primary-50'
                            : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50 font-medium'
                        }`
                      }
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Settings at bottom of nav */}
        <div className="mt-3 pt-2 border-t border-surface-100">
          <NavLink
            to="/settings"
            className={({ isActive: linkActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                linkActive
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50'
              }`
            }
          >
            <Settings size={14} />
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-surface-200 bg-surface-50">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-2xs text-surface-500">Demo Data · PS 26121</span>
        </div>
      </div>
    </aside>
  );
}

// Export for breadcrumbs (backwards-compatible)
export { NAV_ITEMS };
