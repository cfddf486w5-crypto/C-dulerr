import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { AppProvider } from './store/AppContext';
import { I18nProvider } from './lib/i18n';
import { Dashboard } from './views/Dashboard';
import { WeekView } from './views/WeekView';
import { ScheduleForm } from './views/ScheduleForm';
import { ArchiveReceipt } from './views/ArchiveReceipt';
import { Analytics } from './views/Analytics';
import { Settings } from './views/Settings';
import { ImportWizard } from './views/ImportWizard';
import { ArchiveList } from './views/ArchiveList';
import { CarrierPortal } from './views/CarrierPortal';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);

  // If Carrier Portal, don't show the main layout
  if (activeTab === 'carrier_portal') {
    return (
      <div className="relative">
        <button onClick={() => setActiveTab('dashboard')} className="absolute top-4 left-4 z-50 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold">
          ← Quitter Portail
        </button>
        <CarrierPortal />
      </div>
    );
  }

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} toggleTheme={toggleTheme}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'week' && <WeekView />}
      {activeTab === 'schedule' && <ScheduleForm />}
      {activeTab === 'import' && <ImportWizard />}
      {activeTab === 'proof' && <ArchiveReceipt />}
      {activeTab === 'archives' && <ArchiveList />}
      {activeTab === 'analytics' && <Analytics />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </I18nProvider>
  );
}
