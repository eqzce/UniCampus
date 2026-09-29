/**
 * Campus Map Navigation Engine
 * 
 * Extension point for custom 2D/3D indoor navigation, floor plans,
 * Leaflet, Mapbox, Three.js or SVG rendering.
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
}

export const MapEngine = {
  /**
   * Calculate route from user location or origin room to target classroom
   */
  calculateRoute(
    userLocation: Point2D,
    destinationRoom: string
  ): NavigationRoute {
    // Default placeholder route coordinates for Room 301 (Science Building)
    return {
      startPoint: userLocation,
      destinationRoom,
      destinationBuilding: 'Science Building',
      destinationFloor: 3,
      destinationPoint: { x: 125, y: 410 },
      waypoints: [
        { x: 120, y: 220 },
        { x: 160, y: 270 },
        { x: 160, y: 360 },
        { x: 125, y: 410 },
      ],
      distanceMeters: 240,
      estimatedWalkingMinutes: 3,
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
