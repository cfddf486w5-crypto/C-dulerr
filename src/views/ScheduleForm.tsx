import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { detectCarrier, formatDate, validateContainerCheckDigit } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { ContainerEntry } from '../types';

export function ScheduleForm({ initialEntry, onComplete }: { initialEntry?: ContainerEntry, onComplete?: () => void }) {
  const { tenant, entries, addEntry, updateEntry, addNotification, settings } = useAppContext();
  const { t } = useTranslation();
  
  const [warehouse, setWarehouse] = useState(initialEntry?.warehouse || tenant.warehouses[0]?.name || 'Montréal');
  const [doorId, setDoorId] = useState(initialEntry?.doorId || '');
  const [date, setDate] = useState(initialEntry?.date || formatDate(new Date()));
  const [startTime, setStartTime] = useState(initialEntry?.startTime || '');
  const [containerNumber, setContainerNumber] = useState(initialEntry?.containerNumber || '');
  const [lfd, setLfd] = useState(initialEntry?.lfd || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showQuickFill, setShowQuickFill] = useState(false);
  const [quickFillText, setQuickFillText] = useState('');

  // Derived state for the currently selected warehouse
  const selectedWarehouse = useMemo(() => tenant.warehouses.find(w => w.name === warehouse), [tenant.warehouses, warehouse]);
  
  // Available doors for the selected warehouse
  const availableDoors = useMemo(() => {
    return selectedWarehouse?.doors?.filter(d => ['Réception', 'VIP', 'Sans réservation'].includes(d.usage)) || [];
  }, [selectedWarehouse]);

  // When warehouse changes or doors load, auto-select the first valid door
  useEffect(() => {
    if (initialEntry) return; // Skip auto-select when editing
    if (availableDoors.length > 0 && (!doorId || !availableDoors.find(d => d.id === doorId))) {
      setDoorId(availableDoors[0].id);
    } else if (availableDoors.length === 0) {
      setDoorId('');
    }
  }, [availableDoors, doorId, initialEntry]);

  const selectedDoor = useMemo(() => availableDoors.find(d => d.id === doorId), [availableDoors, doorId]);

  const allTimeSlots = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  // Filter out booked slots specifically for this date, warehouse, and door
  const bookedSlots = entries
    .filter(e => e.warehouse === warehouse && e.date === date && e.doorId === doorId && !e.archivedAt && e.id !== initialEntry?.id)
    .map(e => e.startTime);
  
  const availableSlots = useMemo(() => {
    if (!selectedDoor) return [];
    
    // Filter slots based on the door's business hours
    const doorStart = selectedDoor.startTime || '07:00';
    const doorEnd = selectedDoor.endTime || '16:00';
    
    return allTimeSlots.filter(t => {
      return t >= doorStart && t <= doorEnd && !bookedSlots.includes(t);
    });
  }, [selectedDoor, bookedSlots]);

  // Set default start time when available slots change
  useEffect(() => {
    if (initialEntry) return; // Skip when editing
    if (availableSlots.length > 0 && !availableSlots.includes(startTime)) {
      setStartTime(availableSlots[0]);
    } else if (availableSlots.length === 0) {
      setStartTime('');
    }
  }, [availableSlots, startTime, initialEntry]);

  const suggestNextAvailableSlot = () => {
    setError('');
    setSuccess('');
    
    if (!selectedWarehouse || availableDoors.length === 0) {
      setError("Aucun quai disponible pour ce site.");
      return;
    }

    const today = new Date();
    let searchDate = new Date();
    // Only search from selected date if it's in the future
    const selectedD = new Date(date);
    if (selectedD > searchDate) {
      searchDate = selectedD;
    }

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const d = new Date(searchDate);
      d.setDate(d.getDate() + dayOffset);
      const checkDateStr = formatDate(d);
      
      const isToday = checkDateStr === formatDate(today);
      const currentHour = today.getHours();
      const currentMin = today.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

      // Search through all doors for the warehouse
      for (const door of availableDoors) {
        const doorStart = door.startTime || '07:00';
        const doorEnd = door.endTime || '16:00';

        // Check slots for this door
        for (const tSlot of allTimeSlots) {
          if (tSlot < doorStart || tSlot > doorEnd) continue;
          if (isToday && tSlot <= currentTimeStr) continue;

          // Check if slot is booked
          const isBooked = entries.some(e => 
            e.warehouse === warehouse && 
            e.date === checkDateStr && 
            e.doorId === door.id && 
            e.startTime === tSlot &&
            !e.archivedAt &&
            e.id !== initialEntry?.id
          );

          if (!isBooked) {
            setDate(checkDateStr);
            setDoorId(door.id);
            setStartTime(tSlot);
            setSuccess(`✨ Assistant : Créneau trouvé le ${checkDateStr} à ${tSlot} (${door.name}).`);
            return;
          }
        }
      }
    }
    setError("Aucun créneau disponible dans les 14 prochains jours.");
  };

  const handleQuickFill = () => {
    const rawText = quickFillText.trim();
    if (!rawText) return;

    // Simple Regex extraction
    const match = rawText.match(/\b([A-Z]{4}[0-9]{7})\b/i);
    if (match) {
      setContainerNumber(match[1].toUpperCase());
    }

    const explicitLfd = rawText.match(/\blfd\b\D*([0-9]{1,2}\/[0-9]{1,2})/i);
    if (explicitLfd) {
      const [m, d] = explicitLfd[1].split('/').map(Number);
      const currentYear = new Date().getFullYear();
      setLfd(`${currentYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }

    if (/québec|quebec/i.test(rawText)) setWarehouse('Québec');
    else if (/montréal|montreal|mtl/i.test(rawText)) setWarehouse('Montréal');

    setShowQuickFill(false);
    setQuickFillText('');
    setSuccess('✨ Rempli avec succès via IA !');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanContainer = containerNumber.trim().toUpperCase();

    if (!cleanContainer || !date || !startTime || !lfd) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (!/^[A-Z]{4}[0-9]{6,7}$/i.test(cleanContainer)) {
      setError('Format attendu: 4 lettres suivies de 6 ou 7 chiffres (ex: MSMU1234567).');
      return;
    }

    if (settings.autoIso && !validateContainerCheckDigit(cleanContainer)) {
      setError(t('sf_alert_container') || 'Le numéro ISO du conteneur est mathématiquement invalide.');
      return;
    }

    // Check availability
    if (bookedSlots.includes(startTime)) {
      setError(`Le créneau ${startTime} est déjà réservé au quai sélectionné.`);
      return;
    }

    if (initialEntry) {
      // Update
      updateEntry(initialEntry.id, {
        containerNumber: cleanContainer,
        carrier: detectCarrier(cleanContainer),
        warehouse,
        doorId,
        doorName: selectedDoor?.name,
        date,
        startTime,
        lfd,
      });
      const successMsg = `Conteneur ${cleanContainer} mis à jour avec succès.`;
      addNotification(successMsg, 'success');
      setSuccess(successMsg);
      if (onComplete) onComplete();
    } else {
      // Add
      addEntry({
        containerNumber: cleanContainer,
        carrier: detectCarrier(cleanContainer),
        warehouse,
        doorId,
        doorName: selectedDoor?.name,
        date,
        startTime,
        lfd,
      });
      const successMsg = t('sf_notif_success').replace('{0}', cleanContainer).replace('{1}', date).replace('{2}', startTime);
      addNotification(successMsg, 'success');
      setSuccess(successMsg);
      setContainerNumber('');
      setLfd('');
    }
  };

  return (
    <section className="glass-card p-4 sm:p-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {initialEntry ? `✏️ Modifier ${initialEntry.containerNumber}` : `➕ ${t('sf_new_container')}`}
        </h2>
        {!initialEntry && (
          <button 
            type="button" 
            onClick={() => setShowQuickFill(true)}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
          >
            ✨ {t('sf_quickfill')}
          </button>
        )}
      </div>

      {showQuickFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-5 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{t('sf_quickfill')}</h3>
              <button onClick={() => setShowQuickFill(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
            </div>
            <p className="text-sm opacity-80 mb-3">{t('sf_quickfill_desc')} <em>MSMU8712340 40HC LFD 08/20 Montréal</em>) :</p>
            <textarea 
              className="w-full h-32 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black/50 font-mono text-sm mb-4"
              placeholder="..."
              value={quickFillText}
              onChange={(e) => setQuickFillText(e.target.value)}
            />
            <button 
              type="button"
              onClick={handleQuickFill}
              className="w-full py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold hover:brightness-110 shadow-lg shadow-sky-900/20 transition-all"
            >
              🪄 {t('sf_analyze')}
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <label className="block">
            <span className="text-sm font-bold block mb-1">{t('cp_site')}</span>
            <select 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              {tenant.warehouses.map(wh => (
                <option key={wh.name} value={wh.name}>{wh.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold block mb-1">Quai (Dock)</span>
            <select 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
              value={doorId}
              onChange={(e) => setDoorId(e.target.value)}
              required
            >
              {availableDoors.length > 0 ? (
                availableDoors.map(door => (
                  <option key={door.id} value={door.id}>{door.name} ({door.usage})</option>
                ))
              ) : (
                <option value="">-- Aucun quai --</option>
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold block mb-1">{t('cp_date')}</span>
            <input 
              type="date" 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <label className="block">
            <span className="text-sm font-bold flex justify-between items-center mb-1">
              {t('cp_time')}
            </span>
            <select 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            >
              {availableSlots.length > 0 ? (
                availableSlots.map(t => <option key={t} value={t}>{t}</option>)
              ) : (
                <option value="">--</option>
              )}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-bold block mb-1">{t('cp_container')}</span>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30 font-bold uppercase tracking-wider"
              placeholder="Ex: MSMU1234567"
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
              maxLength={11}
              required
            />
            {containerNumber.length >= 4 && (
              <span className="text-xs text-sky-600 dark:text-sky-400 font-bold block mt-1">
                {t('sf_carrier')}: {detectCarrier(containerNumber)}
              </span>
            )}
          </label>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={suggestNextAvailableSlot}
            className="text-sm px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2"
          >
            🤖 Suggérer le prochain créneau disponible
          </button>
        </div>

        <div>
          <label className="block max-w-xs">
            <span className="text-sm font-bold block mb-1">{t('sf_lfd')}</span>
            <input 
              type="date" 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
              value={lfd}
              onChange={(e) => setLfd(e.target.value)}
              required
            />
          </label>
        </div>

        {error && <div className="text-sm text-rose-600 bg-rose-100 p-3 rounded-lg border border-rose-200">{error}</div>}
        {success && <div className="text-sm text-emerald-600 bg-emerald-100 p-3 rounded-lg border border-emerald-200">{success}</div>}

        <div className="pt-4 border-t border-gray-300/30">
          <button 
            type="submit"
            disabled={availableSlots.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold hover:brightness-110 shadow-lg shadow-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('sf_submit')}
          </button>
        </div>
      </form>
    </section>
  );
}
