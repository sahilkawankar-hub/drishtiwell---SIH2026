import { useLocation } from 'react-router-dom';
import { Bell, Wifi } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import { getAlerts } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  // Page title from nav
  const currentNav = NAV_ITEMS.find(n => location.pathname.startsWith(n.path));
  const title = currentNav?.label || 'eRTMAC-NWIS';

  // Active alerts count
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => getAlerts({ status: 'ACTIVE' }),
    refetchInterval: 30000,
  });

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;
  const totalActive = alerts.filter(a => a.status === 'ACTIVE').length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="h-12 bg-white border-b border-surface-200 flex items-center px-4 gap-4 flex-shrink-0 shadow-sm">
      {/* Title */}
      <div className="flex-1">
        <h1 className="text-sm font-bold text-surface-900 tracking-tight">{title}</h1>
      </div>

      {/* Active depth indicator */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-surface-50 rounded-md border border-surface-200">
        <span className="status-dot-normal animate-pulse" />
        <span className="text-2xs text-surface-500 font-semibold uppercase tracking-wider">Active Well</span>
        <span className="text-xs font-mono text-primary-700 font-bold ml-1">2,847 m</span>
        <span className="text-2xs text-surface-600 font-medium ml-1">· Barail Grp</span>
      </div>

      {/* Time */}
      <div className="hidden lg:flex items-center gap-2 text-surface-500">
        <span className="text-2xs font-mono font-medium">{timeStr}</span>
        <span className="text-2xs font-medium">{dateStr}</span>
      </div>

      {/* Alert bell */}
      <button
        id="header-alerts-btn"
        onClick={() => navigate('/alerts')}
        className="relative btn btn-ghost p-2 rounded-md hover:bg-surface-100"
        title="View alerts"
      >
        <Bell size={15} className={criticalCount > 0 ? 'text-status-critical' : highCount > 0 ? 'text-status-high' : 'text-surface-500'} />
        {totalActive > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-2xs font-bold text-white ${criticalCount > 0 ? 'bg-status-critical' : 'bg-status-high'}`}>
            {totalActive > 9 ? '9+' : totalActive}
          </span>
        )}
      </button>

      {/* Connection indicator */}
      <div className="flex items-center gap-1.5 text-2xs text-surface-500 font-medium">
        <Wifi size={13} className="text-status-normal" />
        <span>Connected</span>
      </div>
    </header>
  );
}
