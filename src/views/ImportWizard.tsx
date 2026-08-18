import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { extractContainersFromRawText } from '../lib/ai-parser';
import { useTranslation } from '../lib/i18n';
import { detectCarrier } from '../lib/utils';

export function ImportWizard() {
  const { tenant, importQueue, setImportQueue, addEntry, addNotification } = useAppContext();
  const { t } = useTranslation();

  const [step, setStep] = useState<'import' | 'wizard'>('import');
  const [text, setText] = useState('');
  
  // Wizard state
  const [wizardSite, setWizardSite] = useState(tenant.warehouses[0]?.name || '');
  const [wizardDate, setWizardDate] = useState('');
  const [wizardTime, setWizardTime] = useState('08:00');
  const [applyNext, setApplyNext] = useState(true);

  const pendingQueue = importQueue.filter(q => q.status === 'pending');
  const currentItem = pendingQueue[0];

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const results = extractContainersFromRawText(text);
    const newItems = results.map(r => ({
      id: r.id,
      containerNumber: r.containerNumber,
      lfd: r.lfd,
      rawLine: r.rawLine,
      status: 'pending' as const,
      suggestedSite: r.suggestedSite,
      carrier: r.carrier
    }));
    setImportQueue([...importQueue, ...newItems]);
    setText('');
    setStep('wizard');
  };

  const handleWizardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || !wizardSite || !wizardDate || !wizardTime) return;

    addEntry({
      containerNumber: currentItem.containerNumber,
      carrier: currentItem.carrier || detectCarrier(currentItem.containerNumber),
      warehouse: wizardSite,
      date: wizardDate,
      startTime: wizardTime,
      lfd: currentItem.lfd,
    });

    const updatedQueue = importQueue.map(q => 
      q.id === currentItem.id ? { ...q, status: 'scheduled' as const } : q
    );
    setImportQueue(updatedQueue);

    if (!applyNext) {
      setWizardTime('');
    }
  };

  const handleSkip = () => {
    if (!currentItem) return;
    const updatedQueue = importQueue.map(q => 
      q.id === currentItem.id ? { ...q, status: 'skipped' as const } : q
    );
    setImportQueue(updatedQueue);
  };

  const resetWizard = () => {
    const scheduled = importQueue.filter(q => q.status === 'scheduled').length;
    if (scheduled > 0) {
      addNotification(t('iw_notification').replace('{0}', scheduled.toString()), 'success');
    }
    setImportQueue([]);
    setStep('import');
  };

  if (step === 'wizard' && pendingQueue.length === 0) {
    const scheduled = importQueue.filter(q => q.status === 'scheduled').length;
    const skipped = importQueue.filter(q => q.status === 'skipped').length;
    return (
      <section className="glass-card p-4 sm:p-6 max-w-2xl mx-auto text-center animate-in fade-in">
        <h2 className="text-2xl font-bold mb-4">🎉 {t('iw_success_title')}</h2>
        <p className="mb-6">{t('iw_success_desc')}</p>
        <div className="flex justify-center gap-8 mb-8 text-sm">
          <div><strong className="text-xl text-emerald-600">{scheduled}</strong> {t('iw_added')}</div>
          <div><strong className="text-xl text-gray-500">{skipped}</strong> {t('iw_skipped')}</div>
        </div>
        <button onClick={resetWizard} className="px-6 py-2 bg-sky-600 text-white rounded-xl font-bold">
          {t('iw_new_batch')}
        </button>
      </section>
    );
  }

  if (step === 'wizard' && currentItem) {
    return (
      <section className="glass-card p-4 sm:p-6 max-w-2xl mx-auto animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{t('iw_sequential')}</h2>
          <span className="text-sm font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full">
            {t('iw_remaining')} : {pendingQueue.length}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-gray-300/40 dark:border-gray-600/40 bg-white/20 dark:bg-black/20 mb-6">
          <h3 className="text-2xl font-black tracking-widest text-sky-700 dark:text-sky-400 mb-1">
            {currentItem.containerNumber}
          </h3>
          <p className="text-sm font-bold mb-2">
            LFD: <span className={!currentItem.lfd ? 'text-rose-500' : ''}>{currentItem.lfd || t('iw_missing')}</span>
          </p>
          <div className="text-xs opacity-60 bg-black/5 dark:bg-white/5 p-2 rounded italic">
            "{currentItem.rawLine}"
          </div>
        </div>

        <form onSubmit={handleWizardSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-bold block mb-1">Site</span>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30" value={wizardSite} onChange={e => setWizardSite(e.target.value)} required>
                {tenant.warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold block mb-1">Date</span>
              <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30" value={wizardDate} onChange={e => setWizardDate(e.target.value)} required />
            </label>
            <label className="block">
              <span className="text-xs font-bold block mb-1">Heure</span>
              <input type="time" className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 dark:bg-black/30" value={wizardTime} onChange={e => setWizardTime(e.target.value)} required />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={applyNext} onChange={e => setApplyNext(e.target.checked)} />
            {t('iw_apply_next')}
          </label>

          <div className="flex gap-3 pt-4 border-t border-gray-300/30">
            <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold rounded-xl shadow-md">
              {t('iw_add')}
            </button>
            <button type="button" onClick={handleSkip} className="px-4 py-2.5 bg-gray-200 dark:bg-gray-800 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700">
              {t('iw_skip')}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="glass-card p-4 sm:p-6 max-w-3xl mx-auto animate-in fade-in">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">📋 {t('iw_title')}</h2>
      <p className="text-sm opacity-80 mb-4">
        {t('iw_subtitle')}
      </p>

      <textarea 
        className="w-full h-48 p-4 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30 font-mono text-sm mb-4"
        placeholder={t('iw_placeholder')}
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <div className="flex gap-3">
        <button onClick={handleAnalyze} className="px-6 py-2.5 bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold rounded-xl shadow-md">
          {t('iw_analyze')}
        </button>
        {pendingQueue.length > 0 && (
          <button onClick={() => setStep('wizard')} className="px-6 py-2.5 border border-sky-500 text-sky-600 dark:text-sky-400 font-bold rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20">
            {t('iw_resume')} ({pendingQueue.length})
          </button>
        )}
      </div>
    </section>
  );
}
