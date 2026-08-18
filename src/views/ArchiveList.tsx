import React from 'react';
import { useAppContext } from '../store/AppContext';
import { generateReceiptPDF, generateOsdPDF } from '../lib/pdf';
import { useTranslation } from '../lib/i18n';
import { detectCarrier } from '../lib/utils';

export function ArchiveList() {
  const { entries, proofs, tenant } = useAppContext();
  const { lang, t } = useTranslation();

  const archivedEntries = entries.filter(e => e.archivedAt).sort((a, b) => b.archivedAt!.localeCompare(a.archivedAt!));

  return (
    <section className="glass-card p-4 sm:p-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">📦 {t('al_title')}</h2>

      {archivedEntries.length === 0 ? (
        <p className="text-center opacity-60 py-8">{t('al_empty')}</p>
      ) : (
        <div className="space-y-4">
          {archivedEntries.map(entry => {
            const entryProofs = proofs.filter(p => p.containerId === entry.id);
            const mainProof = entryProofs[0]; // Usually one proof per entry

            return (
              <div key={entry.id} className="border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-black/20 p-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-black tracking-wider flex items-center gap-2">
                      {entry.containerNumber}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-300/30">
                        {detectCarrier(entry.containerNumber)}
                      </span>
                    </h3>
                    <p className="text-xs opacity-70 mt-1">
                      Cédule: {entry.date} à {entry.startTime} | Site: {entry.warehouse}
                    </p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {t('al_received_on')} {entry.archivedAt}
                    </p>
                  </div>
                  
                  {mainProof && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => generateReceiptPDF(mainProof, entry, tenant, lang)}
                        className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm"
                      >
                        📄 {t('al_download_voucher')}
                      </button>
                      {mainProof.osd && (
                        <button 
                          onClick={() => generateOsdPDF(mainProof, entry, tenant, lang)}
                          className="px-3 py-1.5 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm"
                        >
                          ⚠️ {t('al_print_osd')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {mainProof && (
                  <div className="mt-4 pt-4 border-t border-gray-300/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      {mainProof.note && (
                        <p className="text-sm bg-gray-50 dark:bg-black/30 p-2 rounded mb-2">
                          <span className="opacity-60 text-xs block mb-1">Notes:</span>
                          {mainProof.note}
                        </p>
                      )}
                      {mainProof.signatureData && (
                        <div className="mt-2">
                          <span className="opacity-60 text-xs block mb-1">Signature:</span>
                          <img src={mainProof.signatureData} className="h-10 invert dark:invert-0 opacity-80" alt="Signature" />
                        </div>
                      )}
                    </div>
                    {mainProof.photoData && (
                      <div>
                        <span className="opacity-60 text-xs block mb-1">Photo:</span>
                        <img src={mainProof.photoData} className="w-full max-w-[200px] h-auto rounded-lg border border-gray-300/30" alt="Preuve" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
