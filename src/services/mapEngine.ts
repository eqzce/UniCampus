/**
 * Campus Map Navigation Engine
 *
 * Computes corridor waypoints, distance in meters, estimated walking time,
 * and step-by-step indoor navigation across AITU Campus SVG floor plans
 * (SVG viewBox 924.69 x 396.16).
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface NavigationRoute {
  startRoom?: string;
  startPoint: Point2D;
  destinationRoom: string;
  destinationBuilding: string;
  destinationFloor: number;
  destinationPoint: Point2D;
  waypoints: Point2D[];
  distanceMeters: number;
  estimatedWalkingMinutes: number;
  steps: string[];
}

const DEFAULT_ENTRANCE: Point2D = { x: 462, y: 340 };
const MAIN_CORRIDOR_Y = 215;

function inferRoomMetadata(destinationRoom: string): {
  block: string;
  floor: number;
  fallbackPoint: Point2D;
} {
  const upper = destinationRoom.trim().toUpperCase();
  const blockMatch = upper.match(/C1\.(\d)\.(\d{3})/);
  if (blockMatch) {
    const blockNum = blockMatch[1];
    const roomDigits = blockMatch[2];
    const floor = Math.max(1, Math.min(3, Number(roomDigits[0]) || 1));
    const xByBlock: Record<string, number> = {
      '1': 185,
      '2': 462,
      '3': 740,
    };
    return {
      block: `C1.${blockNum}`,
      floor,
      fallbackPoint: { x: xByBlock[blockNum] ?? 462, y: 145 },
    };
  }

  if (upper.includes('LIB')) {
    return { block: 'C1.2', floor: 2, fallbackPoint: { x: 462, y: 155 } };
  }
  if (upper.includes('DINING') || upper.includes('CANTEEN')) {
    return { block: 'C1.1', floor: 1, fallbackPoint: { x: 195, y: 155 } };
  }
  if (upper.includes('ATRIUM')) {
    return { block: 'C1.2', floor: 1, fallbackPoint: { x: 462, y: 265 } };
  }

  const firstDigit = upper.match(/\b([1-3])\d{2}\b/);
  return {
    block: 'C1.2',
    floor: firstDigit ? Number(firstDigit[1]) : 1,
    fallbackPoint: { x: 462, y: 155 },
  };
}

function dedupePoints(points: Point2D[]): Point2D[] {
  const out: Point2D[] = [];
  for (const pt of points) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(prev.x - pt.x, prev.y - pt.y) > 4) {
      out.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
    }
  }
  return out;
}

export const MapEngine = {
  /**
   * Calculate corridor route from user location (or Main Entrance hub) to target classroom
   */
  calculateRoute(
    userLocation: Point2D = DEFAULT_ENTRANCE,
    destinationRoom: string,
    targetSvgPoint?: Point2D
  ): NavigationRoute {
    const startPoint = userLocation || DEFAULT_ENTRANCE;
    const meta = inferRoomMetadata(destinationRoom);
    const destinationPoint = targetSvgPoint || meta.fallbackPoint;

    const rawWaypoints: Point2D[] = [
      startPoint,
      { x: startPoint.x, y: MAIN_CORRIDOR_Y },
      ...(meta.floor > 1 ? [{ x: 462, y: MAIN_CORRIDOR_Y }] : []),
      { x: destinationPoint.x, y: MAIN_CORRIDOR_Y },
      destinationPoint,
    ];
    const waypoints = dedupePoints(rawWaypoints);

    let svgDistance = 0;
    for (let i = 1; i < waypoints.length; i += 1) {
      svgDistance += Math.hypot(
        waypoints[i].x - waypoints[i - 1].x,
        waypoints[i].y - waypoints[i - 1].y
      );
    }

    const distanceMeters = Math.max(
      25,
      Math.round(svgDistance * 0.25 + (meta.floor - 1) * 35)
    );
    const estimatedWalkingMinutes = Math.max(1, Math.ceil(distanceMeters / 65));

    const wingLabel =
      meta.block === 'C1.1'
        ? 'West Wing (Block C1.1)'
        : meta.block === 'C1.3'
          ? 'East Wing (Block C1.3)'
          : 'Central Atrium Wing (Block C1.2)';

    const steps: string[] = [
      'Start from Main Campus Entrance / Atrium Hub (Floor 1).',
      ...(meta.floor > 1
        ? [`Take the central stairs or elevator up to Floor ${meta.floor}.`]
        : []),
      `Follow the main corridor into ${wingLabel}.`,
      `Arrive at ${destinationRoom} (approx. ${distanceMeters} m).`,
    ];

    return {
      startRoom: 'Main Entrance',
      startPoint,
      destinationRoom,
      destinationBuilding: `AITU ${meta.block}`,
      destinationFloor: meta.floor,
      destinationPoint,
      waypoints,
      distanceMeters,
      estimatedWalkingMinutes,
      steps,
    };
  },

  /**
   * Future hook: Load indoor floor plan vector/GeoJSON data
   */
  async loadFloorPlan(buildingId: string, floorNumber: number) {
    console.log(`Loading floorplan for ${buildingId}, Floor ${floorNumber}`);
    return null;
  },
};
