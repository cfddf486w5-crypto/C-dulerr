export interface AppNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  createdAt: string;
  read: boolean;
}

export interface ContainerEntry {
  id: string;
  containerNumber: string;
  carrier: string;
  warehouse: string;
  doorId?: string;
  doorName?: string;
  date: string;
  startTime: string;
  lfd: string;
  imported: boolean;
  source?: string;
  archivedAt: string | null;
  createdAt: string;
}

export interface OsdData {
  product: string;
  quantity: string;
  damageTypes: string[];
  details: string;
  type?: string;
  cost?: string;
  liability?: string;
  notedOnBol?: boolean;
}

export interface Proof {
  id: string;
  containerId: string;
  containerNumber: string;
  warehouse: string;
  receivedDate: string;
  receivedTime: string;
  note: string;
  photoData: string | null;
  signatureData: string | null;
  osd?: OsdData | null;
}

export interface AppSettings {
  alertIntervalMinutes: number;
  muteAlerts: boolean;
  compactMode: boolean;
  reduceMotion: boolean;
  boldId: boolean;
  siteColors: boolean;
  hideArchived: boolean;
  carrierBadges: boolean;
  prioritizeOverdue: boolean;
  highlightLfd: boolean;
  confirmArchive: boolean;
  confirmDelete: boolean;
  autoIso: boolean;
  realtimeDemurrage: boolean;
  pushNotifications?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  defaultLang: string;
  warehouses: Warehouse[];
  demurrageRates: Record<string, number>;
  team: User[];
}

export interface ImportQueueItem {
  id: string;
  containerNumber: string;
  lfd: string;
  rawLine: string;
  status: 'pending' | 'scheduled' | 'skipped';
  suggestedSite?: string;
  carrier?: string;
}

export type DockUsage = 'Expédition' | 'Réception' | 'Fermé' | 'VIP' | 'Sans réservation';
export type ContainerType = '40ft' | '20ft' | 'Cube' | 'Plateforme';
export type DockDevice = 'Lock' | 'Plate' | 'Aucun';

export interface DockDoor {
  id: string;
  name: string;
  usage: DockUsage;
  startTime: string;
  endTime: string;
  supportedTypes: ContainerType[];
  device: DockDevice;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  hours: string;
  doors: DockDoor[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}
