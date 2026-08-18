import React, { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { useAppContext } from '../store/AppContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function Layout({ children, activeTab, setActiveTab, isDark, toggleTheme }: LayoutProps) {
  const { t, toggleLang, lang } = useTranslation();
  const { notifications, markNotificationAsRead, clearNotifications } = useAppContext();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [activeToasts, setActiveToasts] = useState<string[]>([]);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Show newly added unread notifications as toasts
    const newUnread = notifications.filter(n => !n.read && !activeToasts.includes(n.id) && Date.now() - new Date(n.createdAt).getTime() < 5000);
    if (newUnread.length > 0) {
      const newIds = newUnread.map(n => n.id);
      setActiveToasts(prev => [...prev, ...newIds]);
      
      // Auto-hide toasts after 4 seconds
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(id => !newIds.includes(id)));
      }, 4000);
    }
  }, [notifications]);

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: '📊' },
    { id: 'week', label: t('nav_week'), icon: '🗓️' },
    { id: 'schedule', label: t('nav_schedule'), icon: '➕' },
    { id: 'proof', label: t('nav_proof'), icon: '📸' },
    { id: 'analytics', label: t('nav_analytics'), icon: '📈' },
    { id: 'settings', label: t('nav_settings'), icon: '⚙️' },
  ];

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'dark' : ''}`}>
      <div className="max-w-6xl mx-auto p-3 sm:p-4">
        {/* Header */}
        <header className="top-header relative z-[100] rounded-[18px] p-4 flex justify-between items-center mb-4 text-sm sm:text-base">
          <div>
            <h1 className="text-xl font-bold m-0 flex items-center gap-2">✨ {t('app_title')}</h1>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="w-10 h-10 relative flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 hover:bg-white/80 transition-colors shadow-sm text-lg" 
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                    <h3 className="font-bold text-sm text-gray-800 dark:text-white">{t('notifications')}</h3>
                    {notifications.length > 0 && (
                      <button onClick={clearNotifications} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">
                        {t('clear_all')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        {t('no_notifications')}
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.map(n => (
                          <li key={n.id} 
                            className={`p-3 text-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 ${!n.read ? 'bg-sky-50/50 dark:bg-sky-900/20' : ''}`}
                            onClick={() => markNotificationAsRead(n.id)}
                          >
                            <div className="flex gap-3">
                              <span className="text-lg">
                                {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : 'ℹ️'}
                              </span>
                              <div>
                                <p className={`text-gray-800 dark:text-gray-200 ${!n.read ? 'font-bold' : ''}`}>{n.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setActiveTab('carrier_portal')} className="hidden sm:block px-3 py-1.5 rounded-full border border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50">
              {t('carrier_portal_btn')}
            </button>
            <button onClick={toggleLang} className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 hover:bg-white/80 transition-colors shadow-sm text-xs font-bold">
              {lang === 'fr' ? '🌐 EN' : '🌐 FR'}
            </button>
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 shadow-sm text-lg" aria-label="Toggle Theme">
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Sub-navigation for secondary pages */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveTab('import')} className={`px-4 py-1.5 rounded-lg border text-sm font-bold whitespace-nowrap ${activeTab === 'import' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white/50 dark:bg-black/20 border-gray-300/50 dark:border-gray-600/50 hover:bg-white/80'}`}>
            {t('nav_import')}
          </button>
          <button onClick={() => setActiveTab('archives')} className={`px-4 py-1.5 rounded-lg border text-sm font-bold whitespace-nowrap ${activeTab === 'archives' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white/50 dark:bg-black/20 border-gray-300/50 dark:border-gray-600/50 hover:bg-white/80'}`}>
            {t('nav_archives')}
          </button>
          <button onClick={() => setActiveTab('carrier_portal')} className="sm:hidden px-4 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-700 text-sm font-bold whitespace-nowrap">
            {t('carrier_portal_short')}
          </button>
        </div>

        {/* Main Content Area */}
        <main>
          {children}
        </main>
      </div>

        {/* Bottom Navigation */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 grid grid-cols-6 z-40">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`py-3 px-1 text-[10px] sm:text-xs font-bold border-r border-gray-300/30 dark:border-gray-600/30 transition-colors flex flex-col items-center justify-center gap-1
              ${activeTab === item.id ? 'active' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="truncate w-full text-center">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Toast Notifications container */}
      <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.filter(n => activeToasts.includes(n.id)).map(toast => (
          <div key={toast.id} className="bg-slate-800 text-white p-3 rounded-lg shadow-xl flex items-center gap-3 text-sm animate-in slide-in-from-right fade-in pointer-events-auto max-w-xs">
            <span>{toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span className="font-medium">{toast.message}</span>
            <button 
              onClick={() => setActiveToasts(prev => prev.filter(id => id !== toast.id))}
              className="ml-auto text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
