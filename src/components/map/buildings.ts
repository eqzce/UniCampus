import type { FC } from 'react';
import { MainFloor1, MainFloor2, MainFloor3 } from './aitu';

/**
 * Registry of AITU buildings shown in the "Other buildings" menu.
 *
 * To add a map for a building, put its floor components in a folder next to `aitu/`
 * and fill in `floors` below — the map screen picks it up automatically.
 */
export interface CampusBuildingMap {
  id: 'main' | 'iec' | 'turkistan';
  name: string;
  /** Floor number -> SVG floor plan. Empty = map not available yet. */
  floors: Partial<Record<number, FC>>;
}

export const BUILDING_MAPS: CampusBuildingMap[] = [
  {
    id: 'main',
    name: 'Main Campus',
    floors: { 1: MainFloor1, 2: MainFloor2, 3: MainFloor3 },
  },
  { id: 'iec', name: 'IEC', floors: {} },
  { id: 'turkistan', name: 'Turkistan (МВЦ)', floors: {} },
];

export interface ParsedRoom {
  id: string;
  label: string;
  block?: string;
  floor?: number;
}

/**
 * Parses a room `data-name` from the SVG, e.g. "C1.2.105" -> block C1.2, floor 1.
 * Named rooms ("DININGHALL|...") only keep their first alias as label.
 */
export function parseRoom(dataName: string): ParsedRoom {
  const id = dataName.split('|')[0];
  const m = id.match(/^(C\d\.\d)\.(\d)/i);
  if (m) {
    return { id, label: id.toUpperCase(), block: m[1].toUpperCase(), floor: Number(m[2]) };
  }
  const label = id.charAt(0) + id.slice(1).toLowerCase();
  return { id, label };
}

/** Infers the floor from a search query ("C1.1.301" or "301"). */
export function floorFromQuery(query: string): number | null {
  const q = query.trim().toUpperCase();
  const full = q.match(/^C\d\.\d\.(\d)/);
  if (full) return Number(full[1]);
  const short = q.match(/^(\d)\d{2}/);
  if (short) return Number(short[1]);
  return null;
}
