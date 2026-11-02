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
  { id: 'turkistan', name: 'Turkistan (EXPO)', floors: {} },
];

export interface ParsedRoom {
  id: string;
  label: string;
  block?: string;
  floor?: number;
}

/**
 * Complete list of all existing rooms on the AITU Campus Map SVG floors (Floors 1, 2, 3).
 */
export const VALID_CAMPUS_ROOMS: string[] = [
  // Block C1.1 - Floor 1
  'C1.1.139', 'C1.1.140', 'C1.1.141', 'C1.1.142', 'C1.1.143',
  'C1.1.155', 'C1.1.156', 'C1.1.163', 'C1.1.164', 'C1.1.165', 'C1.1.168',
  // Block C1.1 - Floor 2
  'C1.1.221P', 'C1.1.222P', 'C1.1.223P', 'C1.1.224P', 'C1.1.225P',
  'C1.1.226P', 'C1.1.227P', 'C1.1.228P', 'C1.1.229P', 'C1.1.230P',
  'C1.1.231P', 'C1.1.232P', 'C1.1.233P', 'C1.1.234P', 'C1.1.235P',
  'C1.1.238K', 'C1.1.239K', 'C1.1.240K', 'C1.1.241K', 'C1.1.242K',
  'C1.1.244K', 'C1.1.245K', 'C1.1.246', 'C1.1.248', 'C1.1.250',
  'C1.1.251L', 'C1.1.252L', 'C1.1.253L', 'C1.1.254L', 'C1.1.255P',
  'C1.1.256P', 'C1.1.260P', 'C1.1.261', 'C1.1.262', 'C1.1.263',
  'C1.1.264', 'C1.1.265', 'C1.1.266', 'C1.1.267', 'C1.1.268',
  'C1.1.269', 'C1.1.270', 'C1.1.271', 'C1.1.272', 'C1.1.273',
  // Block C1.1 - Floor 3
  'C1.1.318K', 'C1.1.320', 'C1.1.321', 'C1.1.322', 'C1.1.323',
  'C1.1.324L', 'C1.1.325', 'C1.1.326L', 'C1.1.327', 'C1.1.328L',
  'C1.1.329', 'C1.1.330', 'C1.1.332', 'C1.1.333', 'C1.1.334L',
  'C1.1.335', 'C1.1.336', 'C1.1.337', 'C1.1.338', 'C1.1.341P',
  'C1.1.342P', 'C1.1.343P', 'C1.1.344P', 'C1.1.346P', 'C1.1.347P',
  'C1.1.348K', 'C1.1.349P', 'C1.1.350P', 'C1.1.353P', 'C1.1.354K',
  'C1.1.355P', 'C1.1.357K', 'C1.1.358K', 'C1.1.360K', 'C1.1.361K',
  'C1.1.365P', 'C1.1.366P',

  // Block C1.2 - Floor 1
  'C1.2.121K', 'C1.2.122K', 'C1.2.123K', 'C1.2.124K', 'C1.2.129',
  'C1.2.133', 'C1.2.135', 'C1.2.136', 'C1.2.137P', 'C1.2.138L', 'C1.2.139',
  // Block C1.2 - Floor 2
  'C1.2.221P', 'C1.2.222P', 'C1.2.223K', 'C1.2.224P', 'C1.2.225P',
  'C1.2.226P', 'C1.2.227P', 'C1.2.228P', 'C1.2.229P', 'C1.2.230P',
  'C1.2.231K', 'C1.2.232P', 'C1.2.233L', 'C1.2.234K', 'C1.2.237L',
  'C1.2.239K', 'C1.2.240K', 'C1.2.241K', 'C1.2.242K', 'C1.2.243K',
  'C1.2.245', 'C1.2.246', 'C1.2.248L', 'C1.2.249L', 'C1.2.250L',
  'C1.2.251L', 'C1.2.252K', 'C1.2.254', 'C1.2.255',
  // Block C1.2 - Floor 3
  'C1.2.319', 'C1.2.320', 'C1.2.321', 'C1.2.323', 'C1.2.324',
  'C1.2.325', 'C1.2.326', 'C1.2.327', 'C1.2.328', 'C1.2.329',
  'C1.2.330', 'C1.2.331', 'C1.2.332', 'C1.2.334', 'C1.2.335',
  'C1.2.336', 'C1.2.337', 'C1.2.338', 'C1.2.339', 'C1.2.340',
  'C1.2.344', 'C1.2.346', 'C1.2.352', 'C1.2.354', 'C1.2.358',
  'C1.2.359', 'C1.2.360', 'C1.2.362', 'C1.2.363', 'C1.2.364',
  'C1.2.365', 'C1.2.366', 'C1.2.367', 'C1.2.368', 'C1.2.369',
  'C1.2.370', 'C1.2.371', 'C1.2.374', 'C1.2.375', 'C1.2.376',

  // Block C1.3 - Floor 1
  'C1.3.121', 'C1.3.125', 'C1.3.126', 'C1.3.128', 'C1.3.129',
  'C1.3.130', 'C1.3.168', 'C1.3.187', 'C1.3.188',
  // Block C1.3 - Floor 2
  'C1.3.221K', 'C1.3.222P', 'C1.3.223P', 'C1.3.224P', 'C1.3.225P',
  'C1.3.226P', 'C1.3.227P', 'C1.3.228K', 'C1.3.229P', 'C1.3.230P',
  'C1.3.231P', 'C1.3.232P', 'C1.3.233P', 'C1.3.234K', 'C1.3.235L',
  'C1.3.236P', 'C1.3.237P', 'C1.3.240P', 'C1.3.241P', 'C1.3.243P',
  'C1.3.244P', 'C1.3.246', 'C1.3.247P', 'C1.3.248P', 'C1.3.249K',
  'C1.3.250K', 'C1.3.251K', 'C1.3.252K', 'C1.3.253K', 'C1.3.254L',
  'C1.3.255L', 'C1.3.257P', 'C1.3.258P', 'C1.3.259P', 'C1.3.260P',
  'C1.3.261P', 'C1.3.262P', 'C1.3.263P', 'C1.3.264L', 'C1.3.266P', 'C1.3.267P',
  // Block C1.3 - Floor 3
  'C1.3.318P', 'C1.3.319P', 'C1.3.321P', 'C1.3.322P', 'C1.3.323K',
  'C1.3.324K', 'C1.3.327K', 'C1.3.328', 'C1.3.331P', 'C1.3.337',
  'C1.3.338', 'C1.3.339', 'C1.3.340', 'C1.3.341', 'C1.3.342',
  'C1.3.343', 'C1.3.344', 'C1.3.345', 'C1.3.346', 'C1.3.352',
  'C1.3.353', 'C1.3.354', 'C1.3.355', 'C1.3.356', 'C1.3.357P',
  'C1.3.358P', 'C1.3.359P', 'C1.3.360K', 'C1.3.361', 'C1.3.362P',
  'C1.3.365L', 'C1.3.366L', 'C1.3.367K', 'C1.3.370L',

  // Named campus areas
  'LIBRARY', 'DININGHALL', 'ASSEMBLYHALL', 'ATAMEKEN', 'MEDIKER',
];

const ROOM_ALIASES: Record<string, string> = {
  '320': 'C1.1.320',
  'ROOM 320': 'C1.1.320',
  '136': 'C1.2.136',
  'ROOM 136': 'C1.2.136',
  '246': 'C1.3.246',
  'ROOM 246': 'C1.3.246',
  '140': 'C1.1.140',
  'ROOM 140': 'C1.1.140',
  '125': 'C1.3.125',
  'ROOM 125': 'C1.3.125',
  '328': 'C1.3.328',
  'ROOM 328': 'C1.3.328',
  'LIBRARY HALL': 'LIBRARY',
};

export interface RoomValidationResult {
  isValid: boolean;
  canonicalRoom?: string;
  buildingName?: string;
  error?: string;
  suggestions: string[];
}

/**
 * Validates whether a user-entered classroom exists on the campus map.
 */
export function validateCampusRoom(rawInput: string): RoomValidationResult {
  const cleaned = rawInput.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!cleaned) {
    return {
      isValid: false,
      error: 'Please enter an existing classroom (e.g. C1.1.320, C1.2.136, C1.3.246).',
      suggestions: ['C1.1.320', 'C1.2.136', 'C1.3.246', 'C1.1.140', 'C1.2.246', 'C1.3.125'],
    };
  }

  // 1. Check direct alias
  if (ROOM_ALIASES[cleaned]) {
    const canonical = ROOM_ALIASES[cleaned];
    return {
      isValid: true,
      canonicalRoom: canonical,
      buildingName: getBuildingNameForRoom(canonical),
      suggestions: [],
    };
  }

  // 2. Check exact match in VALID_CAMPUS_ROOMS
  const exact = VALID_CAMPUS_ROOMS.find((r) => r.toUpperCase() === cleaned);
  if (exact) {
    return {
      isValid: true,
      canonicalRoom: exact,
      buildingName: getBuildingNameForRoom(exact),
      suggestions: [],
    };
  }

  // 3. Check match without trailing L/P/K suffix (e.g. "C1.1.251" -> "C1.1.251L")
  const withoutSuffix = VALID_CAMPUS_ROOMS.find(
    (r) => r.replace(/[LPK]$/i, '').toUpperCase() === cleaned.replace(/[LPK]$/i, '')
  );
  if (withoutSuffix) {
    return {
      isValid: true,
      canonicalRoom: withoutSuffix,
      buildingName: getBuildingNameForRoom(withoutSuffix),
      suggestions: [],
    };
  }

  // Not found -> build helpful suggestions
  const partialMatches = VALID_CAMPUS_ROOMS.filter((r) =>
    r.toUpperCase().includes(cleaned.replace(/^C/i, ''))
  ).slice(0, 6);

  const suggestions =
    partialMatches.length > 0
      ? partialMatches
      : ['C1.1.320', 'C1.2.136', 'C1.3.246', 'C1.1.140', 'C1.2.246', 'C1.3.125'];

  return {
    isValid: false,
    error: `Room "${rawInput.trim()}" does not exist on the campus map! Please enter an existing room.`,
    suggestions,
  };
}

export function getBuildingNameForRoom(room: string): string {
  const upper = room.toUpperCase();
  if (upper.startsWith('C1.1')) return 'AITU Block C1.1';
  if (upper.startsWith('C1.2')) return 'AITU Block C1.2';
  if (upper.startsWith('C1.3')) return 'AITU Block C1.3';
  return 'AITU Main Campus';
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
