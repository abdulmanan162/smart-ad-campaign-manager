import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RangeProvider } from './lib/RangeContext';
import { CampaignDetail } from './pages/CampaignDetail';
import { Campaigns } from './pages/Campaigns';
import { Compare } from './pages/Compare';
import { Dashboard } from './pages/Dashboard';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RangeProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="compare" element={<Compare />} />
            <Route path="*" element={<p className="empty">Page not found.</p>} />
          </Route>
        </Routes>
      </RangeProvider>
    </BrowserRouter>
  </StrictMode>,
);
