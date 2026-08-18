import { ContainerEntry } from '../types';

export const CARRIER_PREFIXES: Record<string, string> = {
  'MSCU': 'MSC', 'MSMU': 'MSC', 'MEDU': 'MSC', 'MSFU': 'MSC',
  'MAEU': 'Maersk', 'MSKU': 'Maersk', 'MRKU': 'Maersk', 'APZU': 'Maersk',
  'HLCU': 'Hapag-Lloyd', 'HLXU': 'Hapag-Lloyd', 'CPPU': 'Hapag-Lloyd',
  'CMAU': 'CMA CGM', 'CMDU': 'CMA CGM', 'ANXU': 'CMA CGM',
  'COSU': 'COSCO', 'CHNU': 'COSCO', 'CSLU': 'COSCO',
  'ONEY': 'ONE', 'TCLU': 'ONE', 'KKFU': 'ONE',
  'EGLV': 'Evergreen', 'EISU': 'Evergreen',
  'ZIMU': 'ZIM', 'ZCSU': 'ZIM',
};

export function detectCarrier(containerNumber: string): string {
  if (!containerNumber) return 'Inconnu';
  const prefix = containerNumber.trim().toUpperCase().slice(0, 4);
  return CARRIER_PREFIXES[prefix] || 'Inconnu';
}

export function validateContainerCheckDigit(container: string): boolean {
  if (!container || container.length < 11) return false;
  const clean = container.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length !== 11) return false;

  const charValues: Record<string, number> = {
    'A': 10, 'B': 12, 'C': 13, 'D': 14, 'E': 15, 'F': 16, 'G': 17, 'H': 18, 'I': 19,
    'J': 20, 'K': 21, 'L': 23, 'M': 24, 'N': 25, 'O': 26, 'P': 27, 'Q': 28, 'R': 29,
    'S': 30, 'T': 31, 'U': 32, 'V': 34, 'W': 35, 'X': 36, 'Y': 37, 'Z': 38
  };

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = clean[i];
    const val = isNaN(Number(char)) ? (charValues[char] || 0) : parseInt(char, 10);
    sum += val * Math.pow(2, i);
  }

  const checkDigit = (sum % 11) % 10;
  return checkDigit === parseInt(clean[10], 10);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLfdDeltaDays(lfdString: string, referenceDateStr?: string): number | null {
  if (!lfdString) return null;
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  refDate.setHours(0, 0, 0, 0);
  
  const currentYear = refDate.getFullYear();
  let lfdDate: Date;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(lfdString)) {
    lfdDate = new Date(lfdString);
  } else if (/^\d{1,2}\/\d{1,2}$/.test(lfdString)) {
    const [month, day] = lfdString.split('/').map(Number);
    lfdDate = new Date(currentYear, month - 1, day, 0, 0, 0, 0);
  } else {
    return null;
  }
  
  if (isNaN(lfdDate.getTime())) return null;
  
  const diffTime = lfdDate.getTime() - refDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateDemurrage(entry: ContainerEntry, rates: Record<string, number>, refDateStr?: string) {
  if (entry.archivedAt || !entry.lfd) return { days: 0, cost: 0, rate: 150 };
  const todayStr = refDateStr || formatDate(new Date());
  const lfdDelta = getLfdDeltaDays(entry.lfd, todayStr);
  
  if (lfdDelta !== null && lfdDelta < 0) {
    const days = Math.abs(lfdDelta);
    const carrier = detectCarrier(entry.containerNumber);
    const rate = rates[carrier] || rates['Inconnu'] || 150;
    return { days, cost: days * rate, rate, carrier };
  }
  return { days: 0, cost: 0, rate: 150 };
}

export function exportScheduleCSV(entries: ContainerEntry[]) {
  if (entries.length === 0) return;
  
  const headers = ['Container Number', 'Carrier', 'Site', 'Dock', 'Date', 'Time', 'LFD', 'Status'];
  const rows = entries.map(e => [
    e.containerNumber,
    e.carrier,
    e.warehouse,
    e.doorName || '',
    e.date,
    e.startTime,
    e.lfd || '',
    e.archivedAt ? 'Archived' : 'Scheduled'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(v => `"${v}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `container_schedule_${formatDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
