import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateDemurrage, formatDate } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { ContainerEntry } from '../types';
import { ScheduleForm } from './ScheduleForm';

import { SortableScheduleTable } from '../components/SortableScheduleTable';

export function Dashboard() {
  const { entries, tenant } = useAppContext();
  const { t } = useTranslation();
  
  const [editingEntry, setEditingEntry] = useState<ContainerEntry | null>(null);

  // Basic KPI calculations
  const today = formatDate(new Date());
  
  // Calculate this week's entries
  const currentWeekStart = new Date();
  const dayOfWeek = currentWeekStart.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setDate(currentWeekStart.getDate() + diff);
  
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  const weeklyEntries = entries.filter(e => weekDates.includes(e.date));
  const archived = weeklyEntries.filter(e => e.archivedAt).length;
  const overdue = entries.filter(e => e.date < today && !e.archivedAt).length;
  const archiveRate = weeklyEntries.length ? Math.round((archived / weeklyEntries.length) * 100) : 0;
  
  const totalDemurrage = entries.reduce((acc, entry) => {
    return acc + calculateDemurrage(entry, tenant.demurrageRates).cost;
  }, 0);

  // Daily metrics
  const todayEntries = entries.filter(e => e.date === today);
  const todayTotal = todayEntries.length;
  const todayPending = todayEntries.filter(e => !e.archivedAt).length;
  const todayCompleted = todayEntries.filter(e => e.archivedAt).length;
  
  // For active deliveries, let's consider containers that are scheduled for today and not yet completed
  const todayActive = todayEntries.filter(e => !e.archivedAt && e.startTime).length;

  return (
    <section className="glass-card p-4 sm:p-6 mb-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">📊 Dashboard</h2>
      </div>

      {/* Today KPI Grid */}
      <h3 className="text-sm font-bold mb-3 opacity-80 uppercase tracking-wide">Aujourd'hui ({today})</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border-l-4 border-l-sky-500 border-y border-r border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">Conteneurs Prévus</p>
          <h3 className="text-3xl font-black mt-1 text-sky-700 dark:text-sky-300">{todayTotal}</h3>
        </div>
        <div className="p-4 rounded-xl border-l-4 border-l-amber-500 border-y border-r border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">Réceptions en Attente</p>
          <h3 className="text-3xl font-black mt-1 text-amber-600 dark:text-amber-400">{todayPending}</h3>
        </div>
        <div className="p-4 rounded-xl border-l-4 border-l-emerald-500 border-y border-r border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">Livrables / Actifs</p>
          <h3 className="text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{todayActive}</h3>
        </div>
      </div>

      <h3 className="text-sm font-bold mb-3 opacity-80 uppercase tracking-wide">Aperçu de la semaine</h3>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">{t('kpi_week_total')}</p>
          <h3 className="text-2xl font-bold mt-1">{weeklyEntries.length}</h3>
        </div>
        <div className="p-4 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">{t('kpi_archived')}</p>
          <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{archived} <span className="text-sm font-normal opacity-70">({archiveRate}%)</span></h3>
        </div>
        <div className="p-4 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">{t('kpi_overdue')}</p>
          <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{overdue}</h3>
        </div>
        <div className="p-4 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80 uppercase tracking-wide">{t('kpi_demurrage_active')}</p>
          <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{totalDemurrage.toLocaleString()} $</h3>
        </div>
      </div>

      {/* Dock Status Map (Simplified view) */}
      <div className="mt-6">
        <h3 className="text-lg font-bold mb-2">{t('dock_doors_title')}</h3>
        <p className="text-sm opacity-80 mb-4">{t('dock_doors_desc')}</p>
        
        <SortableScheduleTable 
          entries={todayEntries} 
          onRowClick={(entry) => setEditingEntry(entry)} 
        />
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button 
              onClick={() => setEditingEntry(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black rounded-full"
            >
              ✕
            </button>
            <div className="p-4 sm:p-6 border-b border-gray-300/30">
              <h2 className="text-xl font-bold">{t('wv_edit_title')}</h2>
            </div>
            <div className="p-2 sm:p-4">
              <ScheduleForm initialEntry={editingEntry} onComplete={() => setEditingEntry(null)} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
