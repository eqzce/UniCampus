import React, { useState, useEffect } from 'react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { CAMPUS_BUILDINGS, CLASSROOM_LOCATIONS } from '../../data/mockData';
import type { CampusBuilding } from '../../types';
import {
  Search,
  Navigation,
  Layers,
  Plus,
  Minus,
  ListFilter,
  Compass,
  X,
  Footprints,
} from 'lucide-react';

export const CampusMapScreen: React.FC = () => {
  const { selectedRoomForNav, navigateToClassroom } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(
    CAMPUS_BUILDINGS[0]
  );
  const [activeFloor, setActiveFloor] = useState<number>(3);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isNavigating, setIsNavigating] = useState<boolean>(true);
  const [showBuildingList, setShowBuildingList] = useState<boolean>(false);

  // If a room was selected via Schedule ("Show on Map"), highlight it
  useEffect(() => {
    if (selectedRoomForNav) {
      const loc = CLASSROOM_LOCATIONS[selectedRoomForNav];
      if (loc) {
        const b = CAMPUS_BUILDINGS.find((building) => building.id === loc.buildingId);
        if (b) {
          setSelectedBuilding(b);
          setActiveFloor(loc.floor);
          setIsNavigating(true);
        }
      }
    }
  }, [selectedRoomForNav]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.8), 1.8));
  };

  const handleSelectBuilding = (building: CampusBuilding) => {
    setSelectedBuilding(building);
    setActiveFloor(1);
    setIsNavigating(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#e2e8f0] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="CAMPUS MAP" />

      {/* Top Search Input Bar */}
      <div className="absolute top-[72px] left-4 right-4 z-20">
        <div className="relative shadow-md rounded-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search for room or departments"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Search Autocomplete Results */}
        {searchQuery.trim() && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 mt-1 max-h-48 overflow-y-auto p-1.5 space-y-1">
            {CAMPUS_BUILDINGS.filter(
              (b) =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.rooms.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
            ).map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedBuilding(b);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs"
              >
                <div className="font-bold text-slate-800">{b.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  Rooms: {b.rooms.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map Viewport (Stylized 2.5D Isometric University Grounds) */}
      {/* ========================================================================= */}
      {/* EXTENSION POINT: Custom Indoor Navigation Engine / Leaflet / Three.js      */}
      {/* You can replace this container or plug your indoor routing library here   */}
      {/* ========================================================================= */}
      <div className="flex-1 relative overflow-hidden bg-[#e5ece2] flex items-center justify-center">
        
        <div
          className="w-full h-full relative transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* SVG Map Grounds: Paths, lawns, roads */}
          <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="lawn" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#dcedd9" />
                <circle cx="10" cy="10" r="0.8" fill="#c3dcb9" />
              </pattern>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Base Grass */}
            <rect width="400" height="600" fill="url(#lawn)" />

            {/* University Footpaths and Roads */}
            <path
              d="M 50 120 Q 200 180 350 140 L 380 480 Q 240 450 40 520 Z"
              fill="#e2ded4"
              stroke="#cec7b8"
              strokeWidth="2"
            />
            {/* Walkway Grid */}
            <line x1="80" y1="200" x2="320" y2="280" stroke="#f1ede4" strokeWidth="14" strokeLinecap="round" />
            <line x1="160" y1="140" x2="220" y2="460" stroke="#f1ede4" strokeWidth="12" strokeLinecap="round" />
            <line x1="80" y1="360" x2="340" y2="390" stroke="#f1ede4" strokeWidth="10" strokeLinecap="round" />

            {/* Decorative Trees / Park Areas */}
            <g fill="#9bc489" stroke="#79a764" strokeWidth="1.5">
              <circle cx="90" cy="180" r="7" />
              <circle cx="110" cy="170" r="6" />
              <circle cx="100" cy="190" r="8" />
              <circle cx="280" cy="220" r="9" />
              <circle cx="295" cy="210" r="7" />
              <circle cx="310" cy="340" r="8" />
              <circle cx="70" cy="420" r="7" />
              <circle cx="200" cy="470" r="8" />
            </g>

            {/* Blue Navigation Route (Connecting User Location to Classroom 1/Room 301) */}
            {isNavigating && (
              <g>
                <path
                  d="M 120 220 L 160 270 L 160 360 L 125 410"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="5"
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
                {/* Secondary route line for depth */}
                <path
                  d="M 160 270 L 260 300 L 260 410"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  opacity="0.4"
                  strokeDasharray="4 2"
                />
              </g>
            )}

            {/* Building 1: Main Library (top right) */}
            <g
              onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[1])}
              className="cursor-pointer transition-transform hover:opacity-90"
            >
              {/* Isometric building structure */}
              <polygon points="210,190 280,160 330,190 260,220" fill="#e8d8be" stroke="#bfa686" strokeWidth="1" />
              <polygon points="210,190 260,220 260,260 210,230" fill="#c4aa86" stroke="#997d5a" strokeWidth="1" />
              <polygon points="260,220 330,190 330,230 260,260" fill="#a48c6a" stroke="#796245" strokeWidth="1" />
              {/* Roof slope */}
              <polygon points="230,175 270,150 310,175 270,200" fill="#a95d46" />
            </g>

            {/* Building 2: Science Building (middle left) */}
            <g
              onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[0])}
              className="cursor-pointer transition-transform hover:opacity-90"
            >
              <polygon points="80,380 150,350 200,380 130,410" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
              <polygon points="80,380 130,410 130,450 80,420" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
              <polygon points="130,410 200,380 200,420 130,450" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
              {/* Roof detail */}
              <polygon points="100,370 145,345 180,370 135,395" fill="#1e3a8a" />
            </g>

            {/* Building 3: Student Center (middle right) */}
            <g
              onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[2])}
              className="cursor-pointer transition-transform hover:opacity-90"
            >
              <polygon points="240,360 310,330 350,355 280,385" fill="#fed7aa" stroke="#f97316" strokeWidth="1" />
              <polygon points="240,360 280,385 280,415 240,390" fill="#fb923c" stroke="#c2410c" strokeWidth="1" />
              <polygon points="280,385 350,355 350,385 280,415" fill="#ea580c" stroke="#9a3412" strokeWidth="1" />
            </g>

            {/* Building 4: All Classrooms (bottom) */}
            <g
              onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[3])}
              className="cursor-pointer transition-transform hover:opacity-90"
            >
              <polygon points="150,470 230,440 270,465 190,495" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              <polygon points="150,470 190,495 190,525 150,500" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
              <polygon points="190,495 270,465 270,495 190,525" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
            </g>
          </svg>

          {/* HTML Overlay Pins & Badges matching the image */}
          {/* 1. User's Location Badge (top left start of route) */}
          <div className="absolute top-[205px] left-[70px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-full shadow-md border border-blue-200">
            <Navigation className="w-3.5 h-3.5 text-blue-600 fill-blue-600 rotate-45" />
            <span className="text-[10px] font-bold text-slate-800 whitespace-nowrap">
              User's location
            </span>
          </div>

          {/* 2. Building Name Tags matching the image */}
          <div className="absolute top-[170px] left-[270px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
            Main Library
          </div>

          <div className="absolute top-[365px] left-[110px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
            Science Building
          </div>

          <div className="absolute top-[345px] left-[300px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
            Student Center
          </div>

          <div className="absolute top-[490px] left-[200px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
            All Classrooms
          </div>

          {/* 3. Destination Classroom Callout Card matching screenshot */}
          {/* "Classroom 1 \n Classroom \n Due: Class Room 301 \n [Get Directions]" */}
          <div className="absolute top-[385px] left-[235px] -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-xl p-3 shadow-lg border border-slate-200/90 w-44 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-900 leading-tight">
                  Classroom 1
                </h5>
                <p className="text-[10px] text-slate-500">Classroom</p>
                <p className="text-[10px] font-medium text-slate-600 mt-1">
                  Due: Class <span className="font-bold text-blue-700">Room 301</span>
                </p>
                <p className="text-[9px] text-slate-400">Floor 3 • Science Bld.</p>
              </div>
            </div>

            <button
              onClick={() => setIsNavigating(true)}
              className="mt-2.5 w-full bg-[#18458b] hover:bg-blue-900 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </button>
          </div>

        </div>

        {/* Floating Map Tools (Right Column) matching the exact screenshot */}
        <div className="absolute right-3.5 top-[130px] flex flex-col gap-2 z-20">
          {/* User Location Button */}
          <button
            onClick={() => {
              setZoomLevel(1);
              setIsNavigating(true);
            }}
            className="w-9 h-9 bg-white rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title="Locate Me"
          >
            <Navigation className="w-4 h-4 text-blue-600 fill-blue-600" />
          </button>

          {/* Building Directory List Button */}
          <button
            onClick={() => setShowBuildingList(!showBuildingList)}
            className="w-9 h-9 bg-white rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title="Building Directory"
          >
            <ListFilter className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Right Zoom & Layers Tools matching screenshot */}
        <div className="absolute right-3.5 bottom-16 flex flex-col gap-1.5 z-20">
          <button
            onClick={() => handleZoom(0.2)}
            className="w-9 h-9 bg-white rounded-t-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="w-9 h-9 bg-white rounded-b-xl shadow-md border-x border-b border-slate-200/80 -mt-1.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Floor / Layers Selector */}
          <button
            onClick={() => setActiveFloor((prev) => (prev % 4) + 1)}
            className="w-9 h-9 bg-white rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all mt-1"
            title={`Floor Level: ${activeFloor}`}
          >
            <div className="flex flex-col items-center">
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[8px] font-bold leading-none mt-0.5">F{activeFloor}</span>
            </div>
          </button>

          {/* Compass / Orientation */}
          <button
            onClick={() => setZoomLevel(1)}
            className="w-9 h-9 bg-white rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title="Reset Orientation"
          >
            <Compass className="w-4 h-4 text-rose-500" />
          </button>
        </div>

      </div>

      {/* Slide-over Building & Room Directory */}
      {showBuildingList && (
        <div className="absolute inset-x-0 bottom-0 top-[120px] bg-white rounded-t-3xl shadow-2xl z-30 p-5 flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Campus Directory</h4>
              <p className="text-xs text-slate-400">Select any building to view rooms and navigate</p>
            </div>
            <button
              onClick={() => setShowBuildingList(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {CAMPUS_BUILDINGS.map((bld) => (
              <div
                key={bld.id}
                onClick={() => {
                  handleSelectBuilding(bld);
                  setShowBuildingList(false);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedBuilding?.id === bld.id
                    ? 'border-[#18458b] bg-blue-50/50'
                    : 'border-slate-100 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{bld.name}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">
                    {bld.floors} Floors
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{bld.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {bld.rooms.map((rm) => (
                    <span
                      key={rm}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToClassroom(rm);
                        setShowBuildingList(false);
                      }}
                      className="text-[10px] bg-white border border-slate-200 text-blue-700 px-1.5 py-0.5 rounded font-medium hover:bg-blue-50"
                    >
                      {rm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
