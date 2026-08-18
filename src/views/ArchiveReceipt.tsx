import React, { useState, useRef } from 'react';
import { useAppContext } from '../store/AppContext';
import { formatDate } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

export function ArchiveReceipt() {
  const { entries, addProof } = useAppContext();
  const { t } = useTranslation();
  
  const [containerId, setContainerId] = useState('');
  const [receivedTime, setReceivedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState('');
  
  const [isOsdChecked, setIsOsdChecked] = useState(false);
  const [osdData, setOsdData] = useState<{
    product: string;
    quantity: string;
    damageTypes: string[];
    details: string;
  }>({
    product: '',
    quantity: '',
    damageTypes: [],
    details: ''
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeEntries = entries.filter(e => !e.archivedAt).sort((a, b) => a.date.localeCompare(b.date));

  // Canvas drawing handlers
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!containerId) {
      setError("Veuillez sélectionner un conteneur.");
      return;
    }

    const entry = entries.find(e => e.id === containerId);
    if (!entry) return;

    const signatureData = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;

    addProof({
      containerId: entry.id,
      containerNumber: entry.containerNumber,
      warehouse: entry.warehouse,
      receivedDate: formatDate(new Date()),
      receivedTime,
      note,
      photoData: null,
      signatureData,
      osd: isOsdChecked ? {
        product: osdData.product,
        quantity: osdData.quantity,
        damageTypes: osdData.damageTypes,
        details: osdData.details
      } : null
    });
    
    setContainerId('');
    setNote('');
    clearSignature();
    setIsOsdChecked(false);
    setSuccess(`Conteneur ${entry.containerNumber} archivé avec succès !`);
  };

  return (
    <section className="glass-card p-4 sm:p-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">📸 {t('ar_title')}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="text-sm font-bold block mb-1">{t('ar_subtitle')}</span>
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            required
          >
            <option value="">-- Choisir un conteneur --</option>
            {activeEntries.map(entry => (
              <option key={entry.id} value={entry.id}>
                {entry.containerNumber} ({entry.date} - {entry.warehouse})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block">
            <span className="text-sm font-bold block mb-1">{t('ar_arrival_time')}</span>
            <input 
              type="time" 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30"
              value={receivedTime}
              onChange={(e) => setReceivedTime(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="block">
          <span className="text-sm font-bold block mb-1">{t('ar_signature')}</span>
          <div className="border border-dashed border-gray-400 dark:border-gray-600 rounded-xl p-2 bg-white dark:bg-slate-900 text-center">
            <canvas 
              ref={canvasRef}
              width={300} 
              height={100} 
              className="mx-auto bg-transparent cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <button 
              type="button" 
              onClick={clearSignature}
              className="text-xs mt-2 px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {t('ar_clear')}
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-600 dark:text-rose-400">
            <input 
              type="checkbox" 
              checked={isOsdChecked}
              onChange={(e) => setIsOsdChecked(e.target.checked)}
              className="w-4 h-4"
            />
            {t('ar_declare_osd')}
          </label>

          {isOsdChecked && (
            <div className="mt-4 space-y-4 pt-4 border-t border-rose-500/20">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-bold block mb-1">Produit / Code</span>
                  <input 
                    type="text" 
                    placeholder="Ex: abc123"
                    className="w-full px-3 py-2 rounded-lg border border-rose-300/50 bg-white/50 dark:bg-black/30 text-sm"
                    value={osdData.product}
                    onChange={(e) => setOsdData({...osdData, product: e.target.value})}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold block mb-1">Quantité affectée</span>
                  <input 
                    type="text" 
                    placeholder="Ex: 12"
                    className="w-full px-3 py-2 rounded-lg border border-rose-300/50 bg-white/50 dark:bg-black/30 text-sm"
                    value={osdData.quantity}
                    onChange={(e) => setOsdData({...osdData, quantity: e.target.value})}
                  />
                </label>
              </div>

              <div className="block">
                <span className="text-xs font-bold block mb-2">Causes / Nature de l'avarie</span>
                <div className="grid grid-cols-2 gap-2">
                  {['Eau', 'Expéditeur', 'Réception', 'Empilement'].map(dmgType => (
                    <label key={dmgType} className="flex items-center gap-2 text-sm bg-white/50 dark:bg-black/30 border border-rose-300/30 p-2 rounded-lg cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500 rounded border-rose-300"
                        checked={osdData.damageTypes.includes(dmgType)}
                        onChange={(e) => {
                          const newTypes = e.target.checked 
                            ? [...osdData.damageTypes, dmgType]
                            : osdData.damageTypes.filter(t => t !== dmgType);
                          setOsdData({...osdData, damageTypes: newTypes});
                        }}
                      />
                      {dmgType}
                    </label>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-bold block mb-1">Détails de l'avarie</span>
                <textarea 
                  className="w-full px-3 py-2 rounded-lg border border-rose-300/50 bg-white/50 dark:bg-black/30 text-sm min-h-[60px]"
                  placeholder="Ex: conteneur à des craques les boîtes ont pris l'eau..."
                  value={osdData.details}
                  onChange={(e) => setOsdData({...osdData, details: e.target.value})}
                />
              </label>
            </div>
          )}
        </div>

        <label className="block">
          <span className="text-sm font-bold block mb-1">{t('ar_notes')}</span>
          <textarea 
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 bg-white/50 dark:bg-black/30 min-h-[80px]"
            placeholder={t('ar_notes_placeholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="pt-4">
          {error && <div className="mb-4 text-sm text-rose-600 bg-rose-100 p-3 rounded-lg border border-rose-200">{error}</div>}
          {success && <div className="mb-4 text-sm text-emerald-600 bg-emerald-100 p-3 rounded-lg border border-emerald-200">{success}</div>}
          
          <button 
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-bold hover:brightness-110 shadow-lg shadow-emerald-900/20 transition-all"
          >
            {t('ar_validate')}
          </button>
        </div>
      </form>
    </section>
  );
}
