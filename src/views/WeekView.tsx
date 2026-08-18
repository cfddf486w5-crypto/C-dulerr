import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { formatDate, getLfdDeltaDays, calculateDemurrage, detectCarrier, exportScheduleCSV } from '../lib/utils';
import { generateSchedulePDF } from '../lib/pdf';
import { useTranslation } from '../lib/i18n';
import { ContainerEntry } from '../types';
import { SortableScheduleTable } from '../components/SortableScheduleTable';

export function WeekView() {
  const { entries, tenant, settings, updateEntry, deleteEntry } = useAppContext();
  const { t } = useTranslation();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'table'>('week');
  
  const [editingEntry, setEditingEntry] = useState<ContainerEntry | null>(null);

  // --- Week Dates Logic ---
  const dayOfWeek = currentDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + diff);
  startOfWeek.setHours(0,0,0,0);

  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });
  const localizedDays = [t('wv_mon'), t('wv_tue'), t('wv_wed'), t('wv_thu'), t('wv_fri')];

  // --- Month Dates Logic ---
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Find start date to show on calendar (previous month days if month doesn't start on Monday)
  let monthStartDisplay = new Date(firstDayOfMonth);
  const startDay = monthStartDisplay.getDay() || 7; // 1 (Mon) to 7 (Sun)
  monthStartDisplay.setDate(monthStartDisplay.getDate() - (startDay - 1));

  const monthDates: string[] = [];
  const d = new Date(monthStartDisplay);
  for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
    monthDates.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  const localizedAllDays = [t('wv_mon'), t('wv_tue'), t('wv_wed'), t('wv_thu'), t('wv_fri'), t('wv_sat'), t('wv_sun')];


  const todayStr = formatDate(new Date());

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    updateEntry(editingEntry.id, {
      containerNumber: editingEntry.containerNumber,
      carrier: editingEntry.carrier,
      date: editingEntry.date,
      startTime: editingEntry.startTime,
      warehouse: editingEntry.warehouse,
      lfd: editingEntry.lfd
    });
    setEditingEntry(null);
  };

  const renderContainerCard = (entry: ContainerEntry, isCompact: boolean = false) => {
    const isArchived = !!entry.archivedAt;
    const isOverdue = entry.date < todayStr && !isArchived;
    const demurrage = calculateDemurrage(entry, tenant.demurrageRates);
    const lfdDelta = getLfdDeltaDays(entry.lfd, entry.date);

    return (
      <div 
        key={entry.id} 
        onClick={() => !isArchived && setEditingEntry(entry)}
        className={`
        p-2 sm:p-3 rounded-xl border-l-4 text-sm relative group cursor-pointer transition-all hover:scale-[1.02]
        ${isArchived ? 'opacity-75 border-emerald-500 bg-white/30 dark:bg-black/30' : 
          isOverdue ? 'border-rose-500 bg-rose-500/10' : 'border-sky-500 bg-white/40 dark:bg-black/40'}
      `}>
        <div className="font-bold flex justify-between">
          <span className={`${settings.boldId ? 'font-black tracking-wide text-base' : ''} ${isCompact ? 'text-xs' : ''}`}>{entry.containerNumber}</span>
        </div>
        
        {!isCompact && (
          <>
            <div className="text-xs opacity-80 mt-1 flex justify-between">
              <span>{entry.warehouse} | {entry.startTime}</span>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="px-2 py-0.5 rounded-full border border-sky-300/50 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                {detectCarrier(entry.containerNumber)}
              </span>
              
              {!isArchived && entry.lfd && (
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold
                  ${lfdDelta !== null && lfdDelta < 0 ? 'border-rose-500 bg-rose-500/10 text-rose-600' :
                    lfdDelta !== null && lfdDelta <= 1 ? 'border-amber-500 bg-amber-500/10 text-amber-600' :
                    'border-gray-400 bg-gray-500/10'}
                `}>
                  LFD {entry.lfd}
                </span>
              )}
              
              {!entry.lfd && !isArchived && (
                <span className="px-2 py-0.5 rounded-full border border-rose-500 bg-rose-500/10 text-rose-600 text-[10px] font-bold">
                  ⚠️ LFD ?
                </span>
              )}

              {demurrage.cost > 0 && (
                <span className="px-2 py-0.5 rounded-full border border-rose-500 bg-rose-500/10 text-rose-600 text-[10px] font-bold">
                  💰 +{demurrage.cost}$
                </span>
              )}
            </div>
          </>
        )}

        {/* Actions (hover) */}
        {!isArchived && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t('wv_delete_confirm').replace('{0}', entry.containerNumber))) {
                  deleteEntry(entry.id);
                }
              }} 
              className="w-6 h-6 flex items-center justify-center rounded bg-rose-100 dark:bg-rose-900/50 text-rose-600 hover:bg-rose-200"
              title="Supprimer"
            >
              ✕
            </button>
          </div>
        )}
        {isArchived && !isCompact && (
          <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            {t('wv_archived_ro')}
          </div>
        )}
      </div>
    );
  };

  const getFilteredEntries = (dateStr: string) => {
    let dayEntries = entries.filter(e => e.date === dateStr);
    if (search) {
      const s = search.toLowerCase();
      dayEntries = dayEntries.filter(e => 
        e.containerNumber.toLowerCase().includes(s) || 
        e.carrier.toLowerCase().includes(s) || 
        e.warehouse.toLowerCase().includes(s)
      );
    }
    if (settings.hideArchived && !search) {
      dayEntries = dayEntries.filter(e => !e.archivedAt);
    }
    dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return dayEntries;
  };

  return (
    <section className="glass-card p-4 sm:p-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">🗓️ {t('nav_week')}</h2>
          <div className="flex bg-white/50 dark:bg-black/30 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === 'week' ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              {t('wv_week_view')}
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === 'month' ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              {t('wv_month_view')}
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === 'table' ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              Tableau
            </button>
          </div>
        </div>
        
        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} className="px-3 py-1.5 rounded-lg border border-gray-300/50 bg-white/30 dark:bg-black/30 hover:bg-white/50 text-sm">
            {t('prev_week')}
          </button>
          <span className="font-bold text-sm">
            {viewMode === 'week' || viewMode === 'table'
              ? `${t('wv_week_of')} ${formatDate(startOfWeek)}` 
              : currentDate.toLocaleString(settings.defaultLang || 'fr', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg border border-gray-300/50 bg-white/30 dark:bg-black/30 hover:bg-white/50 text-sm">
            {t('today_btn')}
          </button>
          <button onClick={handleNext} className="px-3 py-1.5 rounded-lg border border-gray-300/50 bg-white/30 dark:bg-black/30 hover:bg-white/50 text-sm">
            {t('next_week')}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <input 
          type="search" 
          placeholder={t('wv_search')} 
          className="w-full sm:w-1/3 px-4 py-2 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportScheduleCSV(viewMode === 'week' || viewMode === 'table' ? weekDates.flatMap(d => getFilteredEntries(d)) : monthDates.flatMap(d => getFilteredEntries(d)))}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-300/50 bg-white/30 dark:bg-black/30 hover:bg-white/50 flex items-center gap-2"
          >
            <span>📊</span> CSV
          </button>
          <button
            onClick={() => generateSchedulePDF(viewMode === 'week' || viewMode === 'table' ? weekDates.flatMap(d => getFilteredEntries(d)) : monthDates.flatMap(d => getFilteredEntries(d)), tenant, settings.defaultLang)}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-2"
          >
            <span>📄</span> PDF
          </button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {weekDates.map((dateStr, idx) => {
            const dayEntries = getFilteredEntries(dateStr);
            return (
              <div key={dateStr} className="border border-gray-300/30 dark:border-gray-600/30 rounded-xl bg-white/10 dark:bg-black/10 p-3 min-h-[200px]">
                <h3 className="text-center font-bold mb-3 border-b border-gray-300/30 dark:border-gray-600/30 pb-2">
                  {localizedDays[idx]} <br/>
                  <span className={`text-xs font-normal ${dateStr === todayStr ? 'bg-sky-500 text-white px-2 py-0.5 rounded-full font-bold' : 'opacity-70'}`}>{dateStr}</span>
                </h3>
                <div className="space-y-3">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-center opacity-50 italic">{t('wv_empty_day')}</p>
                  ) : (
                    dayEntries.map(entry => renderContainerCard(entry))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        <SortableScheduleTable 
          entries={weekDates.flatMap(d => getFilteredEntries(d))} 
          onRowClick={(entry) => setEditingEntry(entry)} 
        />
      ) : (
        <div className="border border-gray-300/30 dark:border-gray-600/30 rounded-xl bg-white/10 dark:bg-black/10 overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-100/50 dark:bg-slate-800/50 border-b border-gray-300/30 dark:border-gray-600/30">
            {localizedAllDays.map(day => (
              <div key={day} className="p-2 text-center text-xs font-bold opacity-70">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDates.map((dateStr) => {
              const d = new Date(dateStr + 'T00:00:00');
              const isCurrentMonth = d.getMonth() === currentDate.getMonth();
              const dayEntries = getFilteredEntries(dateStr);
              
              return (
                <div key={dateStr} className={`min-h-[100px] border-r border-b border-gray-300/30 dark:border-gray-600/30 p-1.5 sm:p-2 ${isCurrentMonth ? '' : 'bg-gray-50/50 dark:bg-black/20 opacity-60'}`}>
                  <div className="text-right mb-1">
                    <span className={`text-xs inline-block w-6 h-6 text-center leading-6 rounded-full ${dateStr === todayStr ? 'bg-sky-500 text-white font-bold' : ''}`}>
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[150px] scrollbar-hide">
                    {dayEntries.map(entry => renderContainerCard(entry, true))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">{t('wv_edit_title')}</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold block mb-1">{t('cp_container')}</span>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30 font-bold uppercase"
                  value={editingEntry.containerNumber}
                  onChange={e => setEditingEntry({...editingEntry, containerNumber: e.target.value})}
                  required
                />
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-bold block mb-1">{t('cp_date')}</span>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30"
                    value={editingEntry.date}
                    onChange={e => setEditingEntry({...editingEntry, date: e.target.value})}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold block mb-1">{t('cp_time')}</span>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30"
                    value={editingEntry.startTime}
                    onChange={e => setEditingEntry({...editingEntry, startTime: e.target.value})}
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-bold block mb-1">{t('cp_site')}</span>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30"
                    value={editingEntry.warehouse}
                    onChange={e => setEditingEntry({...editingEntry, warehouse: e.target.value})}
                  >
                    {tenant.warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold block mb-1">{t('sf_lfd')}</span>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30"
                    value={editingEntry.lfd}
                    onChange={e => setEditingEntry({...editingEntry, lfd: e.target.value})}
                  />
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold"
                >
                  {t('wv_cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  {t('wv_edit_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
