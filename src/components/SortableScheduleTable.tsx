import React, { useState, useMemo, useRef } from 'react';
import { ContainerEntry } from '../types';
import { detectCarrier } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

type SortField = 'date' | 'startTime' | 'containerNumber' | 'warehouse' | 'doorName' | 'carrier' | 'status';
type SortOrder = 'asc' | 'desc';

interface SortableScheduleTableProps {
  entries: ContainerEntry[];
  onRowClick?: (entry: ContainerEntry) => void;
}

export function SortableScheduleTable({ entries, onRowClick }: SortableScheduleTableProps) {
  const { t, lang } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Long press refs
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isScrolling = useRef(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleTouchStart = (e: ContainerEntry) => {
    isScrolling.current = false;
    if (!onRowClick || e.archivedAt) return;
    
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (!isScrolling.current) {
        onRowClick(e);
        // Provide haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 600); // 600ms for long press
  };

  const handleTouchMove = () => {
    isScrolling.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'date':
          valA = a.date; valB = b.date;
          break;
        case 'startTime':
          valA = a.startTime; valB = b.startTime;
          break;
        case 'containerNumber':
          valA = a.containerNumber; valB = b.containerNumber;
          break;
        case 'warehouse':
          valA = a.warehouse; valB = b.warehouse;
          break;
        case 'doorName':
          valA = a.doorName || ''; valB = b.doorName || '';
          break;
        case 'carrier':
          valA = a.carrier; valB = b.carrier;
          break;
        case 'status':
          valA = a.archivedAt ? 1 : 0; valB = b.archivedAt ? 1 : 0;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Secondary sort by time if date is sorted
    if (sortField === 'date') {
      sorted.sort((a, b) => {
        if (a.date === b.date) {
          if (a.startTime < b.startTime) return sortOrder === 'asc' ? -1 : 1;
          if (a.startTime > b.startTime) return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sorted;
  }, [entries, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1 text-sky-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  if (entries.length === 0) {
    return <div className="text-center p-8 opacity-60 italic border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/10 dark:bg-black/10">Aucun conteneur</div>;
  }

  const isEn = lang === 'en';

  return (
    <div className="overflow-x-auto border border-gray-300/40 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-black/20">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/50 dark:bg-black/50 border-b border-gray-300/40 dark:border-gray-600/40">
          <tr>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('date')}>
              Date {renderSortIcon('date')}
            </th>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('startTime')}>
              {isEn ? 'Time' : 'Heure'} {renderSortIcon('startTime')}
            </th>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('containerNumber')}>
              Conteneur {renderSortIcon('containerNumber')}
            </th>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('warehouse')}>
              Site {renderSortIcon('warehouse')}
            </th>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('doorName')}>
              Quai {renderSortIcon('doorName')}
            </th>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('carrier')}>
              {isEn ? 'Carrier' : 'Ligne'} {renderSortIcon('carrier')}
            </th>
            <th className="p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap" onClick={() => handleSort('status')}>
              Statut {renderSortIcon('status')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300/20 dark:divide-gray-600/20">
          {sortedEntries.map(e => (
            <tr 
              key={e.id} 
              className={`hover:bg-white/40 dark:hover:bg-black/40 transition-colors select-none ${onRowClick && !e.archivedAt ? 'cursor-pointer md:active:bg-sky-500/10' : ''} ${e.archivedAt ? 'opacity-60' : ''}`}
              onClick={() => onRowClick && onRowClick(e)}
              onTouchStart={() => handleTouchStart(e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <td className="p-3">{e.date}</td>
              <td className="p-3 font-bold">{e.startTime}</td>
              <td className="p-3 font-mono">{e.containerNumber}</td>
              <td className="p-3">{e.warehouse}</td>
              <td className="p-3">{e.doorName || '-'}</td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded-full border border-sky-300/50 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                  {detectCarrier(e.containerNumber)}
                </span>
              </td>
              <td className="p-3">
                {e.archivedAt ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Archivé</span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Prévu</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
