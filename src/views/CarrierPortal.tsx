import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { useTranslation } from '../lib/i18n';
import { detectCarrier, formatDate } from '../lib/utils';

export function CarrierPortal() {
  const { tenant, entries, addEntry, addNotification } = useAppContext();
  const { t, lang, toggleLang } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [containerNumber, setContainerNumber] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [time, setTime] = useState('');
  const [company, setCompany] = useState('');
  const [passCode, setPassCode] = useState('');
  const [warehouse, setWarehouse] = useState(tenant.warehouses[0]?.name || '');
  const [doorId, setDoorId] = useState('');

  const [error, setError] = useState('');

  // Derived state for the currently selected warehouse
  const selectedWarehouse = useMemo(() => tenant.warehouses.find(w => w.name === warehouse), [tenant.warehouses, warehouse]);
  
  // Available doors for the selected warehouse
  const availableDoors = useMemo(() => {
    return selectedWarehouse?.doors?.filter(d => ['Réception', 'VIP', 'Sans réservation'].includes(d.usage)) || [];
  }, [selectedWarehouse]);

  // When warehouse changes or doors load, auto-select the first valid door
  useEffect(() => {
    if (availableDoors.length > 0 && (!doorId || !availableDoors.find(d => d.id === doorId))) {
      setDoorId(availableDoors[0].id);
    } else if (availableDoors.length === 0) {
      setDoorId('');
    }
  }, [availableDoors, doorId]);

  const selectedDoor = useMemo(() => availableDoors.find(d => d.id === doorId), [availableDoors, doorId]);

  const allTimeSlots = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  // Filter out booked slots specifically for this date, warehouse, and door
  const bookedSlots = entries
    .filter(e => e.warehouse === warehouse && e.date === date && e.doorId === doorId && !e.archivedAt)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanContainer = containerNumber.trim().toUpperCase();

    if (!time) {
      setError(t('cp_alert_time'));
      return;
    }
    
    if (bookedSlots.includes(time)) {
      setError(`Le créneau ${time} est déjà réservé.`);
      return;
    }

    const code = `DK-MTL-${Math.floor(1000 + Math.random() * 9000)}`;
    setPassCode(code);
    
    // Add real entry
    addEntry({
      containerNumber: cleanContainer,
      carrier: company || detectCarrier(cleanContainer),
      warehouse,
      doorId,
      doorName: selectedDoor?.name,
      date,
      startTime: time,
      lfd: '', // Carriers might not know LFD, or we ask them. Leaving blank.
      source: 'Carrier Portal'
    });

    addNotification(`Nouvelle réservation externe : ${cleanContainer} par ${company} le ${date} à ${time}.`, 'warning');

    setStep(2);
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl relative">
          <div className="absolute top-4 right-4">
             <button className="px-3 py-1 rounded-full border border-gray-300 text-xs font-bold" onClick={toggleLang}>
               {lang === 'fr' ? '🌐 EN' : '🌐 FR'}
             </button>
          </div>
          <div className="text-center mb-6">
            <span className="text-5xl block mb-2">🎉</span>
            <h2 className="text-2xl font-bold text-emerald-600">{t('cp_success_title')}</h2>
            <p className="text-sm text-slate-500 mt-2">{t('cp_success_desc')}</p>
          </div>

          <div className="bg-slate-50 border-2 border-dashed border-sky-500 rounded-xl p-6 text-center mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('cp_pass_code')}</p>
            <div className="text-3xl font-black tracking-widest text-sky-700 bg-white py-2 rounded-lg border border-sky-100">
              {passCode}
            </div>
          </div>

          <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p><strong>{t('cp_container')}:</strong> <span className="font-mono">{containerNumber.toUpperCase()}</span></p>
            <p><strong>{t('cp_company')}:</strong> {company}</p>
            <p><strong>{t('cp_date')}:</strong> {date} / {time}</p>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => window.print()} className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700">
              {t('cp_print')}
            </button>
            <button onClick={() => { setStep(1); setContainerNumber(''); setTime(''); }} className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300">
              {t('cp_new')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl">
        <div className="text-center mb-6 border-b-2 border-sky-500 pb-4">
          <span className="inline-block px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full mb-2">{t('cp_badge')}</span>
          <h1 className="text-2xl font-bold text-sky-600">{t('cp_title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('cp_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold block mb-1">{t('cp_company')}</span>
            <input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex: Transport Morneau" />
          </label>
          
          <label className="block">
            <span className="text-sm font-bold block mb-1">{t('cp_container')}</span>
            <input type="text" required maxLength={11} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-sky-500 outline-none" value={containerNumber} onChange={e => setContainerNumber(e.target.value.toUpperCase())} placeholder="MSMU1234567" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-bold block mb-1">{t('cp_site')}</span>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              >
                {tenant.warehouses.map(wh => (
                  <option key={wh.name} value={wh.name}>{wh.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold block mb-1">Quai</span>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                value={doorId}
                onChange={(e) => setDoorId(e.target.value)}
                required
              >
                {availableDoors.length > 0 ? (
                  availableDoors.map(door => (
                    <option key={door.id} value={door.id}>{door.name}</option>
                  ))
                ) : (
                  <option value="">Aucun quai</option>
                )}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-bold block mb-1">{t('cp_date')}</span>
              <input type="date" required min={formatDate(new Date())} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" value={date} onChange={e => setDate(e.target.value)} />
            </label>
          </div>

          <div className="pt-2">
            <span className="text-sm font-bold block mb-2">{t('cp_time')}</span>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {availableSlots.length > 0 ? availableSlots.map(tSlot => (
                <button
                  key={tSlot}
                  type="button"
                  onClick={() => setTime(tSlot)}
                  className={`py-2 text-sm font-bold rounded-lg border ${time === tSlot ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-sky-300'}`}
                >
                  {tSlot}
                </button>
              )) : (
                <div className="col-span-4 text-center text-sm text-slate-500 py-4">
                  Aucun créneau disponible pour cette date.
                </div>
              )}
            </div>
          </div>
          
          {error && <div className="text-sm text-rose-600 bg-rose-100 p-3 rounded-lg border border-rose-200 mt-2">{error}</div>}

          <button type="submit" className="w-full mt-4 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 shadow-md">
            {t('cp_confirm')}
          </button>
        </form>
      </div>
    </div>
  );
}
