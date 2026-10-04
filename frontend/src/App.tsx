import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import ActiveWellPage from './pages/ActiveWell';
import NearbyWellsPage from './pages/NearbyWells';
import WellDetailPage from './pages/WellDetail';
import KnowledgePage from './pages/Knowledge';
import DocumentsPage from './pages/Documents';
import ComparisonPage from './pages/Comparison';
import CorrelationPage from './pages/Correlation';
import RiskIntelligencePage from './pages/RiskIntelligence';
import AlertsPage from './pages/Alerts';
import RecommendationsPage from './pages/Recommendations';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            {/* Redirect root to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Main modules */}
            <Route path="dashboard"        element={<Dashboard />} />
            <Route path="active-well"      element={<ActiveWellPage />} />
            <Route path="nearby-wells"     element={<NearbyWellsPage />} />
            <Route path="wells/:id"        element={<WellDetailPage />} />

            {/* Knowledge & Data */}
            <Route path="knowledge"        element={<KnowledgePage />} />
            <Route path="documents"        element={<DocumentsPage />} />
            <Route path="comparison"       element={<ComparisonPage />} />
            <Route path="correlation"      element={<CorrelationPage />} />

            {/* Risk & Alerts */}
            <Route path="risk-intelligence" element={<RiskIntelligencePage />} />
            <Route path="alerts"           element={<AlertsPage />} />
            <Route path="recommendations"  element={<RecommendationsPage />} />

            {/* Reports */}
            <Route path="reports"          element={<ReportsPage />} />
            <Route path="settings"         element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
