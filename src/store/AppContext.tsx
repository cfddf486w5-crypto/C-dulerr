import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContainerEntry, Proof, AppSettings, Tenant, User, ImportQueueItem, AppNotification } from '../types';

interface AppContextType {
  entries: ContainerEntry[];
  proofs: Proof[];
  settings: AppSettings;
  tenant: Tenant;
  user: User | null;
  importQueue: ImportQueueItem[];
  notifications: AppNotification[];
  addEntry: (entry: Omit<ContainerEntry, 'id' | 'createdAt' | 'archivedAt' | 'imported'>) => void;
  updateEntry: (id: string, updates: Partial<ContainerEntry>) => void;
  deleteEntry: (id: string) => void;
  addProof: (proof: Omit<Proof, 'id'>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateTenant: (updates: Partial<Tenant>) => void;
  setImportQueue: (queue: ImportQueueItem[]) => void;
  addNotification: (message: string, type?: 'info' | 'success' | 'warning') => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const defaultSettings: AppSettings = {
  alertIntervalMinutes: 60,
  muteAlerts: false,
  compactMode: false,
  reduceMotion: false,
  boldId: true,
  siteColors: true,
  hideArchived: false,
  carrierBadges: true,
  prioritizeOverdue: true,
  highlightLfd: true,
  confirmArchive: true,
  confirmDelete: true,
  autoIso: true,
  realtimeDemurrage: true,
  pushNotifications: false,
};

const defaultTenant: Tenant = {
  id: 'tenant-default-01',
  name: 'Mon Entreprise Logistique',
  subdomain: 'logistique',
  email: 'dispatch@entreprise.ca',
  phone: '(514) 555-0100',
  address: '1000 rue de la Logistique, Montréal, QC',
  currency: 'CAD',
  defaultLang: 'fr',
  warehouses: [
    { 
      id: 'wh-mtl', 
      name: 'Montréal', 
      address: 'Quai Principal', 
      hours: '07:00 - 16:00',
      doors: []
    },
    { 
      id: 'wh-qc', 
      name: 'Québec', 
      address: 'Terminal Maritime', 
      hours: '08:00 - 16:00',
      doors: []
    }
  ],
  demurrageRates: { 'MSC': 165, 'Maersk': 180, 'Hapag-Lloyd': 170, 'CMA CGM': 175, 'COSCO': 155, 'ONE': 165, 'Inconnu': 150 },
  team: []
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ContainerEntry[]>(() => {
    try {
      const saved = localStorage.getItem('CONTAINER_SCHEDULE_ENTRIES_V1');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [proofs, setProofs] = useState<Proof[]>(() => {
    try {
      const saved = localStorage.getItem('CONTAINER_PROOFS_V1');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('APP_FUNCTIONAL_SETTINGS_V1');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch { return defaultSettings; }
  });

  const [tenant, setTenant] = useState<Tenant>(() => {
    try {
      const saved = localStorage.getItem('APP_TENANT_V1');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        parsed.warehouses = parsed.warehouses.map((w: any) => ({
          ...w,
          id: w.id || `wh-${Math.random().toString(36).substring(2, 9)}`,
          doors: w.doors || []
        }));
        return parsed;
      }
      return { ...defaultTenant, team: [] };
    } catch { return { ...defaultTenant, team: [] }; }
  });

  const [importQueue, setImportQueueState] = useState<ImportQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('CONTAINER_IMPORT_QUEUE_V1');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [user, setUser] = useState<User | null>({
    id: 'user-default-01',
    email: 'dispatch@entreprise.ca',
    fullName: 'Superviseur Logistique',
    role: 'admin'
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('APP_NOTIFICATIONS_V1');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('CONTAINER_SCHEDULE_ENTRIES_V1', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('CONTAINER_PROOFS_V1', JSON.stringify(proofs));
  }, [proofs]);

  useEffect(() => {
    localStorage.setItem('APP_TENANT_V1', JSON.stringify(tenant));
  }, [tenant]);

  useEffect(() => {
    localStorage.setItem('CONTAINER_IMPORT_QUEUE_V1', JSON.stringify(importQueue));
  }, [importQueue]);

  useEffect(() => {
    localStorage.setItem('APP_FUNCTIONAL_SETTINGS_V1', JSON.stringify(settings));
    if (settings.compactMode) document.body.classList.add('compact');
    else document.body.classList.remove('compact');
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('APP_NOTIFICATIONS_V1', JSON.stringify(notifications));
  }, [notifications]);

  const addEntry = (entryData: Omit<ContainerEntry, 'id' | 'createdAt' | 'archivedAt' | 'imported'>) => {
    const newEntry: ContainerEntry = {
      ...entryData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      archivedAt: null,
      imported: false,
    };
    setEntries(prev => [...prev, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<ContainerEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addProof = (proofData: Omit<Proof, 'id'>) => {
    const newProof: Proof = {
      ...proofData,
      id: crypto.randomUUID()
    };
    setProofs(prev => [newProof, ...prev]);
    // Marquer l'entrée comme archivée
    updateEntry(proofData.containerId, { 
      archivedAt: `${proofData.receivedDate} ${proofData.receivedTime}` 
    });
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updateTenant = (updates: Partial<Tenant>) => {
    setTenant(prev => ({ ...prev, ...updates }));
  };

  const setImportQueue = (queue: ImportQueueItem[]) => {
    setImportQueueState(queue);
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: AppNotification = {
      id: crypto.randomUUID(),
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50

    // Trigger browser native notification if enabled and type is warning (urgent)
    if (type === 'warning' && settings.pushNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Alerte Logistique Urgente', { body: message, icon: '/favicon.ico' });
      }
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <AppContext.Provider value={{ 
      entries, proofs, settings, tenant, user, importQueue, notifications,
      addEntry, updateEntry, deleteEntry, addProof, updateSettings, updateTenant, setImportQueue,
      addNotification, markNotificationAsRead, clearNotifications
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
