import React, { useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateDemurrage, formatDate } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Analytics() {
  const { entries, tenant } = useAppContext();
  const { t } = useTranslation();

  const todayStr = formatDate(new Date());

  let savedDemurrage = 0;
  let riskDemurrage = 0;
  let totalArchived = 0;
  let onTimeDeliveries = 0;
  let mtlCount = 0;
  let qcCount = 0;

  const transporterStats = new Map<string, { total: number; onTime: number }>();

  entries.forEach(entry => {
    if (entry.warehouse === 'Montréal') mtlCount++;
    if (entry.warehouse === 'Québec') qcCount++;

    // Simplified transporter stats assuming carrier = transporter for this MVP
    const transporter = entry.carrier || 'Transport Standard';
    if (!transporterStats.has(transporter)) {
      transporterStats.set(transporter, { total: 0, onTime: 0 });
    }
    const stat = transporterStats.get(transporter)!;
    stat.total++;

    const rate = tenant.demurrageRates[entry.carrier] || 150;

    if (entry.archivedAt) {
      totalArchived++;
      stat.onTime++;
      onTimeDeliveries++;
      // Estimate savings: 2 days of LFD preserved on average if compliant
      savedDemurrage += rate * 2;
    } else {
      if (entry.date < todayStr) {
        const diff = Math.floor((new Date().getTime() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24));
        riskDemurrage += diff * rate;
      }
    }
  });

  const onTimeRate = entries.length ? Math.round((onTimeDeliveries / entries.length) * 100) : 100;
  const statsArray = Array.from(transporterStats.entries()).map(([name, s]) => ({
    name,
    total: s.total,
    onTime: s.onTime,
    rate: Math.round((s.onTime / s.total) * 100)
  }));

  const total = Math.max(1, entries.length);

  // Calculate daily throughput and capacity
  const chartData = useMemo(() => {
    // Total docks capacity (each dock roughly handles let's say 1 container per slot, but we'll chart total container vs total docks if we want an index, or we'll chart actual capacity if we count slots)
    // The prompt says: "visualize daily container throughput against the configured number of docks"
    const totalDocks = tenant.warehouses.reduce((acc, wh) => acc + (wh.doors?.length || 0), 0);
    
    // We'll calculate the daily throughput for the last 14 days
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      
      const count = entries.filter(e => e.date === dateStr).length;
      data.push({
        date: dateStr.slice(5), // MM-DD
        Throughput: count,
        Capacity: totalDocks, // Just displaying total active docks as a reference line
      });
    }
    return data;
  }, [entries, tenant.warehouses]);

  return (
    <section className="glass-card p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📈 {t('analytics_page_title')}</h2>
          <p className="opacity-70 text-sm">{t('analytics_page_desc')}</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-sm shadow-md" onClick={() => window.print()}>
          📄 {t('btn_export_exec_report')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border-l-4 border-emerald-500 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80">{t('ana_saved_demurrage_title')}</p>
          <h3 className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{savedDemurrage.toLocaleString()} $</h3>
        </div>
        <div className="p-4 rounded-xl border-l-4 border-sky-500 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80">{t('ana_total_containers_title')}</p>
          <h3 className="text-xl sm:text-2xl font-bold mt-1 text-sky-600 dark:text-sky-400">{entries.length}</h3>
        </div>
        <div className="p-4 rounded-xl border-l-4 border-amber-500 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80">{t('ana_on_time_rate_title')}</p>
          <h3 className="text-xl sm:text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{onTimeRate}%</h3>
        </div>
        <div className="p-4 rounded-xl border-l-4 border-rose-500 bg-white/20 dark:bg-black/20">
          <p className="text-xs opacity-80">{t('ana_risk_demurrage_title')}</p>
          <h3 className="text-xl sm:text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{riskDemurrage.toLocaleString()} $</h3>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20 mb-6">
        <h3 className="font-bold mb-4">📊 Débit Journalier vs Capacité (Quais configurés)</h3>
        <div className="h-64 w-full text-sm">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Throughput" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Conteneurs cédulés" />
              <Line type="step" dataKey="Capacity" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Total quais configurés" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <h3 className="font-bold mb-4">🚚 {t('transporter_scorecard_title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-300/30 dark:border-gray-600/30">
                  <th className="pb-2">{t('th_company')}</th>
                  <th className="pb-2">{t('th_deliveries')}</th>
                  <th className="pb-2">{t('th_on_time')}</th>
                  <th className="pb-2">{t('th_punctuality')}</th>
                </tr>
              </thead>
              <tbody>
                {statsArray.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center opacity-50 italic">{t('no_transporter_data')}</td></tr>
                ) : (
                  statsArray.map(stat => (
                    <tr key={stat.name} className="border-b border-gray-300/10 dark:border-gray-600/10">
                      <td className="py-2 font-bold">{stat.name}</td>
                      <td className="py-2">{stat.total}</td>
                      <td className="py-2">{stat.onTime}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${stat.rate >= 90 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {stat.rate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20">
          <h3 className="font-bold mb-4">🏢 {t('dock_utilization_title')}</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold mb-1">
                <span>{t('quais_mtl_label')}</span>
                <span>{mtlCount} {t('containers_count_unit')}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: `${(mtlCount / total) * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-1">
                <span>{t('quais_qc_label')}</span>
                <span>{qcCount} {t('containers_count_unit')}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(qcCount / total) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
