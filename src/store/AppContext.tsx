import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContainerEntry, Proof, AppSettings, Tenant, User, ImportQueueItem, AppNotification } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';

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
  const [entries, setEntries] = useState<ContainerEntry[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [tenant, setTenant] = useState<Tenant>(defaultTenant);
  const [importQueue, setImportQueueState] = useState<ImportQueueItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [user, setUser] = useState<User | null>({
    id: 'user-default-01',
    email: 'dispatch@entreprise.ca',
    fullName: 'Superviseur Logistique',
    role: 'admin'
  });

  // --- Firestore Real-time Listeners ---
  useEffect(() => {
    // 1. Listen to Entries
    const qEntries = query(collection(db, 'entries'));
    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      const data: ContainerEntry[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as ContainerEntry));
      setEntries(data);
    });

    // 2. Listen to Proofs
    const qProofs = query(collection(db, 'proofs'));
    const unsubscribeProofs = onSnapshot(qProofs, (snapshot) => {
      const data: Proof[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Proof));
      setProofs(data);
    });

    // 3. Listen to Tenant config
    const unsubscribeTenant = onSnapshot(doc(db, 'config', 'tenant-default-01'), (docSnap) => {
      if (docSnap.exists()) {
        const parsed = docSnap.data() as Tenant;
        parsed.warehouses = parsed.warehouses.map((w: any) => ({
          ...w,
          id: w.id || `wh-${crypto.randomUUID().substring(0, 8)}`,
          doors: w.doors || []
        }));
        setTenant(parsed);
      } else {
        // Init default tenant in DB if missing
        setDoc(doc(db, 'config', 'tenant-default-01'), defaultTenant);
      }
    });

    // 4. Listen to Settings (Stored per-tenant or global for now)
    const unsubscribeSettings = onSnapshot(doc(db, 'config', 'global-settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() });
      }
    });

    // 5. Listen to Notifications
    const qNotifs = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
      const data: AppNotification[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(data);
    });

    return () => {
      unsubscribeEntries();
      unsubscribeProofs();
      unsubscribeTenant();
      unsubscribeSettings();
      unsubscribeNotifs();
    };
  }, []);

  // Sync settings body class
  useEffect(() => {
    if (settings.compactMode) document.body.classList.add('compact');
    else document.body.classList.remove('compact');
  }, [settings]);

  // Sync local queue (keeps import queue in localStorage as it's transient per-device)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('CONTAINER_IMPORT_QUEUE_V1');
      if (saved) setImportQueueState(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('CONTAINER_IMPORT_QUEUE_V1', JSON.stringify(importQueue));
  }, [importQueue]);


  // --- Write Actions ---

  const addEntry = async (entryData: Omit<ContainerEntry, 'id' | 'createdAt' | 'archivedAt' | 'imported'>) => {
    const id = crypto.randomUUID();
    const newEntry: ContainerEntry = {
      ...entryData,
      id,
      createdAt: new Date().toISOString(),
      archivedAt: null,
      imported: false,
    };
    await setDoc(doc(db, 'entries', id), newEntry);
  };

  const updateEntry = async (id: string, updates: Partial<ContainerEntry>) => {
    // Merge into Firestore
    await setDoc(doc(db, 'entries', id), updates, { merge: true });
  };

  const deleteEntry = async (id: string) => {
    await deleteDoc(doc(db, 'entries', id));
  };

  const addProof = async (proofData: Omit<Proof, 'id'>) => {
    const id = crypto.randomUUID();
    const newProof: Proof = {
      ...proofData,
      id
    };
    await setDoc(doc(db, 'proofs', id), newProof);
    // Mark entry as archived
    await updateEntry(proofData.containerId, { 
       archivedAt: `${proofData.receivedDate} ${proofData.receivedTime}` 
    });
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    await setDoc(doc(db, 'config', 'global-settings'), updates, { merge: true });
  };

  const updateTenant = async (updates: Partial<Tenant>) => {
    await setDoc(doc(db, 'config', 'tenant-default-01'), updates, { merge: true });
  };

  const setImportQueue = (queue: ImportQueueItem[]) => {
    setImportQueueState(queue);
  };

  const addNotification = async (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = crypto.randomUUID();
    const newNotif: AppNotification = {
      id,
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    await setDoc(doc(db, 'notifications', id), newNotif);

    if (type === 'warning' && settings.pushNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Alerte Logistique Urgente', { body: message, icon: '/favicon.ico' });
      }
    }
  };

  const markNotificationAsRead = async (id: string) => {
    await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
  };

  const clearNotifications = () => {
    // In a real app, we'd batch delete or query unread. 
    // Here we just delete the current ones in state for simplicity.
    notifications.forEach(async (n) => {
      await deleteDoc(doc(db, 'notifications', n.id));
    });
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
