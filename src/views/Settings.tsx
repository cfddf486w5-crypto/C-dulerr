import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { useTranslation } from '../lib/i18n';
import { Warehouse, User, DockDoor, DockUsage, ContainerType, DockDevice } from '../types';

export function Settings() {
  const { settings, updateSettings, tenant, updateTenant, addNotification } = useAppContext();
  const { t } = useTranslation();

  const [expandedSection, setExpandedSection] = useState<string | null>('options');
  
  const [newWhName, setNewWhName] = useState('');
  const [newWhDoorsCount, setNewWhDoorsCount] = useState(1);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('operator');
  
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleToggle = (key: keyof typeof settings) => {
    if (key === 'pushNotifications') {
      if (!settings.pushNotifications) {
        if ('Notification' in window) {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              updateSettings({ pushNotifications: true });
              addNotification('Notifications activées avec succès', 'success');
              new Notification('Test de notification', { body: 'Les alertes urgentes apparaîtront ici.' });
            } else {
              alert('Permission refusée par le navigateur.');
            }
          });
        } else {
          alert('Votre navigateur ne supporte pas les notifications.');
        }
      } else {
        updateSettings({ pushNotifications: false });
      }
      return;
    }
    updateSettings({ [key]: !settings[key] });
  };

  const addWarehouse = () => {
    if (!newWhName) return;
    
    // Generate initial doors based on count
    const doors: DockDoor[] = Array.from({ length: newWhDoorsCount }, (_, i) => ({
      id: `door-${Math.random().toString(36).substring(2, 9)}`,
      name: `Quai ${i + 1}`,
      usage: 'Réception',
      startTime: '07:00',
      endTime: '16:00',
      supportedTypes: ['40ft', '20ft', 'Cube'],
      device: 'Lock'
    }));

    const newWh: Warehouse = { 
      id: `wh-${Math.random().toString(36).substring(2, 9)}`,
      name: newWhName, 
      address: `${newWhDoorsCount} quais configurés`, 
      hours: '07:00 - 16:00',
      doors
    };
    
    updateTenant({ warehouses: [...tenant.warehouses, newWh] });
    setNewWhName('');
    setNewWhDoorsCount(1);
  };

  const removeWarehouse = (id: string) => {
    updateTenant({ warehouses: tenant.warehouses.filter(w => w.id !== id) });
  };

  const updateDoor = (siteId: string, doorId: string, updates: Partial<DockDoor>) => {
    const updatedWarehouses = tenant.warehouses.map(w => {
      if (w.id !== siteId) return w;
      return {
        ...w,
        doors: w.doors.map(d => d.id === doorId ? { ...d, ...updates } : d)
      };
    });
    updateTenant({ warehouses: updatedWarehouses });
  };

  const addUser = () => {
    if (!newUserEmail) return;
    const newUser: User = { id: crypto.randomUUID(), email: newUserEmail, fullName: newUserName || newUserEmail.split('@')[0], role: newUserRole };
    updateTenant({ team: [...(tenant.team || []), newUser] });
    setNewUserName('');
    setNewUserEmail('');
  };

  const removeUser = (id: string) => {
    updateTenant({ team: (tenant.team || []).filter(u => u.id !== id) });
  };

  return (
    <section className="glass-card p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">⚙️ {t('st_title')}</h2>
        <p className="opacity-70 text-sm mt-1">{t('st_desc')}</p>
      </div>

      <div className="space-y-4">
        {/* Sites & Warehouses */}
        <div className="border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/10 dark:bg-black/10 overflow-hidden">
          <button className="w-full px-5 py-4 flex justify-between items-center font-bold text-left hover:bg-white/5 dark:hover:bg-black/20" onClick={() => toggleSection('warehouses')}>
            <span>{t('st_sites')}</span>
            <span>{expandedSection === 'warehouses' ? '▾' : '▸'}</span>
          </button>
          
          {expandedSection === 'warehouses' && (
            <div className="px-5 pb-5 pt-2">
              <div className="space-y-4 mb-6">
                {tenant.warehouses.map(w => (
                  <div key={w.id} className="border border-gray-300/30 rounded-xl bg-white/20 dark:bg-black/20 overflow-hidden">
                    <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-white/5 dark:hover:bg-white/5" onClick={() => setExpandedSiteId(expandedSiteId === w.id ? null : w.id)}>
                      <div>
                        <strong className="block text-sm">{w.name}</strong>
                        <span className="text-xs opacity-70">{w.doors?.length || 0} quais configurés</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-60">{expandedSiteId === w.id ? 'Fermer' : 'Éditer quais'}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeWarehouse(w.id); }} className="text-rose-500 hover:text-rose-700 text-sm font-bold px-2 py-1 ml-2">✕</button>
                      </div>
                    </div>

                    {expandedSiteId === w.id && w.doors && (
                      <div className="p-4 border-t border-gray-300/30 bg-white/40 dark:bg-black/30 space-y-4">
                        {w.doors.map(door => (
                          <div key={door.id} className="border border-gray-300/50 dark:border-gray-600/50 rounded-lg p-3 space-y-3 bg-white/50 dark:bg-black/40">
                            <div className="flex justify-between items-center">
                              <h5 className="font-bold text-sm">{door.name}</h5>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <label>
                                <span className="text-[10px] font-bold block mb-1 uppercase opacity-80">Utilisation</span>
                                <select 
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-300/50 bg-white/50 text-xs dark:bg-black/30"
                                  value={door.usage}
                                  onChange={(e) => updateDoor(w.id, door.id, { usage: e.target.value as DockUsage })}
                                >
                                  <option value="Expédition">Expédition</option>
                                  <option value="Réception">Réception</option>
                                  <option value="Fermé">Fermé</option>
                                  <option value="VIP">VIP</option>
                                  <option value="Sans réservation">Sans réservation</option>
                                </select>
                              </label>
                              
                              <label>
                                <span className="text-[10px] font-bold block mb-1 uppercase opacity-80">Heures ouvrables</span>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="time" 
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-300/50 bg-white/50 text-xs dark:bg-black/30"
                                    value={door.startTime}
                                    onChange={(e) => updateDoor(w.id, door.id, { startTime: e.target.value })}
                                  />
                                  <span className="text-xs opacity-50">-</span>
                                  <input 
                                    type="time" 
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-300/50 bg-white/50 text-xs dark:bg-black/30"
                                    value={door.endTime}
                                    onChange={(e) => updateDoor(w.id, door.id, { endTime: e.target.value })}
                                  />
                                </div>
                              </label>

                              <label className="col-span-2">
                                <span className="text-[10px] font-bold block mb-1 uppercase opacity-80">Conteneurs acceptés</span>
                                <div className="flex flex-wrap gap-2">
                                  {['40ft', '20ft', 'Cube', 'Plateforme'].map(type => (
                                    <label key={type} className="flex items-center gap-1.5 text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-gray-300/30 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/20">
                                      <input 
                                        type="checkbox" 
                                        className="w-3 h-3 text-sky-600 rounded"
                                        checked={door.supportedTypes.includes(type as ContainerType)}
                                        onChange={(e) => {
                                          const newTypes = e.target.checked 
                                            ? [...door.supportedTypes, type as ContainerType]
                                            : door.supportedTypes.filter(t => t !== type);
                                          updateDoor(w.id, door.id, { supportedTypes: newTypes });
                                        }}
                                      />
                                      {type}
                                    </label>
                                  ))}
                                </div>
                              </label>

                              <label className="col-span-2">
                                <span className="text-[10px] font-bold block mb-1 uppercase opacity-80">Dispositif</span>
                                <select 
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-300/50 bg-white/50 text-xs dark:bg-black/30"
                                  value={door.device}
                                  onChange={(e) => updateDoor(w.id, door.id, { device: e.target.value as DockDevice })}
                                >
                                  <option value="Lock">Lock (Dok-Lok)</option>
                                  <option value="Plate">Plate (Plaque niveleuse)</option>
                                  <option value="Aucun">Aucun</option>
                                </select>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end border-t border-gray-300/30 pt-4">
                <label className="flex-1">
                  <span className="text-xs font-bold block mb-1">{t('st_new_site')}</span>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 text-sm dark:bg-black/30" value={newWhName} onChange={e=>setNewWhName(e.target.value)} placeholder="Ex: Laval" />
                </label>
                <label className="w-32">
                  <span className="text-xs font-bold block mb-1">Nombre de quais</span>
                  <input type="number" min="1" max="50" className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 text-sm dark:bg-black/30" value={newWhDoorsCount} onChange={e=>setNewWhDoorsCount(parseInt(e.target.value) || 1)} />
                </label>
                <button onClick={addWarehouse} className="px-4 py-2 bg-sky-600 text-white rounded-lg font-bold text-sm">{t('st_add')}</button>
              </div>
            </div>
          )}
        </div>

        {/* Team */}
        <div className="border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/10 dark:bg-black/10 overflow-hidden">
          <button className="w-full px-5 py-4 flex justify-between items-center font-bold text-left hover:bg-white/5 dark:hover:bg-black/20" onClick={() => toggleSection('team')}>
            <span>{t('st_team')}</span>
            <span>{expandedSection === 'team' ? '▾' : '▸'}</span>
          </button>
          
          {expandedSection === 'team' && (
            <div className="px-5 pb-5 pt-2">
              <div className="space-y-2 mb-4">
                {(tenant.team || []).map(u => (
                  <div key={u.id} className="flex justify-between items-center p-3 border border-gray-300/30 rounded-lg bg-white/20 dark:bg-black/20">
                    <div>
                      <strong className="block text-sm">{u.fullName}</strong>
                      <span className="text-xs opacity-70">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase font-bold bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">{u.role}</span>
                      <button onClick={() => removeUser(u.id)} className="text-rose-500 hover:text-rose-700 text-sm font-bold px-2 py-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 items-end border-t border-gray-300/30 pt-4">
                <label>
                  <span className="text-xs font-bold block mb-1">{t('st_name')}</span>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 text-sm dark:bg-black/30" value={newUserName} onChange={e=>setNewUserName(e.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-bold block mb-1">{t('st_email')}</span>
                  <input type="email" className="w-full px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 text-sm dark:bg-black/30" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-bold block mb-1">{t('st_role')}</span>
                  <div className="flex gap-2">
                    <select className="flex-1 px-3 py-2 rounded-lg border border-gray-300/50 bg-white/50 text-sm dark:bg-black/30" value={newUserRole} onChange={e=>setNewUserRole(e.target.value)}>
                      <option value="operator">{t('st_role_operator')}</option>
                      <option value="dispatcher">{t('st_role_dispatcher')}</option>
                      <option value="admin">{t('st_role_admin')}</option>
                    </select>
                    <button onClick={addUser} className="px-3 py-2 bg-sky-600 text-white rounded-lg font-bold text-sm">➕</button>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Billing */}
        <div className="border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/10 dark:bg-black/10 overflow-hidden">
          <button className="w-full px-5 py-4 flex justify-between items-center font-bold text-left hover:bg-white/5 dark:hover:bg-black/20" onClick={() => toggleSection('billing')}>
            <span>{t('st_billing')}</span>
            <span>{expandedSection === 'billing' ? '▾' : '▸'}</span>
          </button>
          
          {expandedSection === 'billing' && (
            <div className="px-5 pb-5 pt-2">
              <div className="p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-sky-800 dark:text-sky-300">Pro Multi-Sites</h3>
                  <p className="text-sm opacity-80">{t('st_plan_trial')} <strong>{t('st_plan_trial_days')}</strong></p>
                </div>
                <button className="px-4 py-2 bg-sky-600 text-white rounded-lg font-bold text-sm">{t('st_plan_portal')}</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-300/50 rounded-xl p-4 text-center bg-white/30 dark:bg-black/30 opacity-70">
                  <h4 className="font-bold">Starter</h4>
                  <p className="text-2xl font-black my-2">99 $ <span className="text-sm font-normal">/ mois</span></p>
                  <p className="text-xs">1 site, 30 conteneurs</p>
                </div>
                <div className="border-2 border-sky-500 rounded-xl p-4 text-center bg-white/50 dark:bg-black/50 relative shadow-lg">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t('st_plan_rec')}</span>
                  <h4 className="font-bold text-sky-700 dark:text-sky-400">Pro</h4>
                  <p className="text-2xl font-black my-2 text-sky-600 dark:text-sky-300">249 $ <span className="text-sm font-normal">/ mois</span></p>
                  <p className="text-xs font-bold text-sky-800 dark:text-sky-200">Sites/Conteneurs illimités</p>
                </div>
                <div className="border border-gray-300/50 rounded-xl p-4 text-center bg-white/30 dark:bg-black/30">
                  <h4 className="font-bold">Entreprise</h4>
                  <p className="text-2xl font-black my-2">499 $ <span className="text-sm font-normal">/ mois</span></p>
                  <p className="text-xs">Alertes SMS & API ERP</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Options */}
        <div className="border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/10 dark:bg-black/10 overflow-hidden">
          <button 
            className="w-full px-5 py-4 flex justify-between items-center font-bold text-left hover:bg-white/5 dark:hover:bg-black/20"
            onClick={() => toggleSection('options')}
          >
            <span>{t('st_options')}</span>
            <span>{expandedSection === 'options' ? '▾' : '▸'}</span>
          </button>
          
          {expandedSection === 'options' && (
            <div className="px-5 pb-5 pt-2 space-y-6">
              
              <div>
                <h4 className="font-bold text-sky-600 dark:text-sky-400 mb-3">{t('st_opt_display')}</h4>
                <div className="space-y-4">
                  <ToggleOption 
                    label="Notifications Push (Bureau/Mobile)"
                    desc="Recevoir des alertes urgentes via le système d'exploitation"
                    checked={!!settings.pushNotifications} 
                    onChange={() => handleToggle('pushNotifications')} 
                  />
                  <ToggleOption 
                    label={t('st_opt_bold')}
                    desc={t('st_opt_bold_desc')}
                    checked={settings.boldId} 
                    onChange={() => handleToggle('boldId')} 
                  />
                  <ToggleOption 
                    label={t('st_opt_hide')}
                    desc={t('st_opt_hide_desc')}
                    checked={settings.hideArchived} 
                    onChange={() => handleToggle('hideArchived')} 
                  />
                  <ToggleOption 
                    label={t('st_opt_compact')} 
                    desc={t('st_opt_compact_desc')}
                    checked={settings.compactMode} 
                    onChange={() => handleToggle('compactMode')} 
                  />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sky-600 dark:text-sky-400 mb-3">{t('st_opt_ai')}</h4>
                <div className="space-y-4">
                  <ToggleOption 
                    label={t('st_opt_iso')}
                    desc={t('st_opt_iso_desc')}
                    checked={settings.autoIso} 
                    onChange={() => handleToggle('autoIso')} 
                  />
                  <ToggleOption 
                    label={t('st_opt_demurrage')}
                    desc={t('st_opt_demurrage_desc')}
                    checked={settings.realtimeDemurrage} 
                    onChange={() => handleToggle('realtimeDemurrage')} 
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ToggleOption({ label, desc, checked, onChange }: { label: string, desc: string, checked: boolean, onChange: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-4 p-3 rounded-lg hover:bg-white/5 dark:hover:bg-black/10 transition-colors">
      <div>
        <strong className="block text-sm">{label}</strong>
        <p className="text-xs opacity-70 mt-0.5">{desc}</p>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    </label>
  );
}
