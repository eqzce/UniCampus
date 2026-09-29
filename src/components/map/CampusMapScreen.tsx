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
  ExternalLink,
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
  const [mapMode, setMapMode] = useState<'aitumap' | 'isometric'>('aitumap');

  // When room is selected from Schedule or Dashboard, update state
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
      if (selectedRoomForNav.includes('301')) {
        setSearchQuery('C1.1.301');
      } else if (selectedRoomForNav.includes('105')) {
        setSearchQuery('C1.2.105');
      } else if (selectedRoomForNav.includes('204')) {
        setSearchQuery('C1.3.204');
      } else {
        setSearchQuery(selectedRoomForNav);
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

  const aituQuickTags = [
    { label: 'C1.1.301 (Physics)', room: 'C1.1.301', floor: 3 },
    { label: 'C1.2.105 (Math)', room: 'C1.2.105', floor: 1 },
    { label: 'C1.3.204 (Seminar)', room: 'C1.3.204', floor: 2 },
    { label: 'Library', room: 'Library Hall', floor: 2 },
    { label: 'Coworking', room: 'Coworking', floor: 1 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="CAMPUS MAP" subtitle="Astana IT University (AITU)" />

      {/* Top Search & Filter Bar */}
      <div className="px-3 pt-2.5 pb-2 bg-[#18458b] text-white shadow-sm z-20 flex flex-col gap-2">
        {/* Search Input styled to match UniCampus theme */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search AITU room (e.g. C1.1.301, C1.2.105, Coworking)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Location Pills & Floor Bar */}
        <div className="flex items-center justify-between gap-1 text-[11px]">
          {/* Quick tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {aituQuickTags.map((tag) => (
              <button
                key={tag.room}
                onClick={() => {
                  navigateToClassroom(tag.room);
                  setActiveFloor(tag.floor);
                  setSearchQuery(tag.room);
                }}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                  searchQuery.includes(tag.room) || selectedRoomForNav === tag.room
                    ? 'bg-emerald-500 text-white shadow-xs font-bold'
                    : 'bg-white/15 text-blue-100 hover:bg-white/25'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: AITU Official Interactive Map vs 3D Isometric Overview */}
          <div className="flex items-center bg-black/20 p-0.5 rounded-lg flex-shrink-0 ml-1">
            <button
              onClick={() => setMapMode('aitumap')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                mapMode === 'aitumap'
                  ? 'bg-white text-[#18458b] shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
              title="Official AITU Indoor Vector Map"
            >
              AITU Map
            </button>
            <button
              onClick={() => setMapMode('isometric')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                mapMode === 'isometric'
                  ? 'bg-white text-[#18458b] shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
              title="3D Campus Grounds Overview"
            >
              3D View
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="flex-1 relative overflow-hidden bg-slate-100 flex items-center justify-center">
        
        {/* MODE 1: Official Astana IT University Map (yuujiso.github.io/aitumap) */}
        {mapMode === 'aitumap' && (
          <div className="w-full h-full relative bg-slate-50 flex flex-col">
            <iframe
              src="https://yuujiso.github.io/aitumap/"
              title="Astana IT University Map"
              className="w-full h-full border-none"
              allow="geolocation"
              loading="lazy"
            />
            {/* Quick Helper overlay */}
            <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs border border-slate-200/80 text-[10px] text-slate-700 font-semibold flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>AITU Live Indoor Map</span>
            </div>
          </div>
        )}

        {/* MODE 2: 3D Isometric University Campus Grounds (Design Mockup) */}
        {mapMode === 'isometric' && (
          <div
            className="w-full h-full relative transition-transform duration-300 bg-[#e5ece2]"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* SVG Isometric Campus Grounds */}
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="lawn" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="#dcedd9" />
                  <circle cx="10" cy="10" r="0.8" fill="#c3dcb9" />
                </pattern>
              </defs>

              <rect width="400" height="600" fill="url(#lawn)" />

              {/* Walkways */}
              <path
                d="M 50 120 Q 200 180 350 140 L 380 480 Q 240 450 40 520 Z"
                fill="#e2ded4"
                stroke="#cec7b8"
                strokeWidth="2"
              />
              <line x1="80" y1="200" x2="320" y2="280" stroke="#f1ede4" strokeWidth="14" strokeLinecap="round" />
              <line x1="160" y1="140" x2="220" y2="460" stroke="#f1ede4" strokeWidth="12" strokeLinecap="round" />
              <line x1="80" y1="360" x2="340" y2="390" stroke="#f1ede4" strokeWidth="10" strokeLinecap="round" />

              {/* Park Trees */}
              <g fill="#9bc489" stroke="#79a764" strokeWidth="1.5">
                <circle cx="90" cy="180" r="7" />
                <circle cx="110" cy="170" r="6" />
                <circle cx="280" cy="220" r="9" />
                <circle cx="295" cy="210" r="7" />
                <circle cx="310" cy="340" r="8" />
                <circle cx="70" cy="420" r="7" />
              </g>

              {/* Navigation Route */}
              {isNavigating && (
                <path
                  d="M 120 220 L 160 270 L 160 360 L 125 410"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="5"
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              )}

              {/* Building 1: AITU Library & Coworking (top right) */}
              <g onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[3])} className="cursor-pointer">
                <polygon points="210,190 280,160 330,190 260,220" fill="#e8d8be" stroke="#bfa686" strokeWidth="1" />
                <polygon points="210,190 260,220 260,260 210,230" fill="#c4aa86" stroke="#997d5a" strokeWidth="1" />
                <polygon points="260,220 330,190 330,230 260,260" fill="#a48c6a" stroke="#796245" strokeWidth="1" />
                <polygon points="230,175 270,150 310,175 270,200" fill="#a95d46" />
              </g>

              {/* Building 2: AITU Block C1.1 (Physics & Labs) */}
              <g onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[0])} className="cursor-pointer">
                <polygon points="80,380 150,350 200,380 130,410" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
                <polygon points="80,380 130,410 130,450 80,420" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
                <polygon points="130,410 200,380 200,420 130,450" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
                <polygon points="100,370 145,345 180,370 135,395" fill="#1e3a8a" />
              </g>

              {/* Building 3: AITU Block C1.3 (Seminar rooms & Council) */}
              <g onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[2])} className="cursor-pointer">
                <polygon points="240,360 310,330 350,355 280,385" fill="#fed7aa" stroke="#f97316" strokeWidth="1" />
                <polygon points="240,360 280,385 280,415 240,390" fill="#fb923c" stroke="#c2410c" strokeWidth="1" />
                <polygon points="280,385 350,355 350,385 280,415" fill="#ea580c" stroke="#9a3412" strokeWidth="1" />
              </g>

              {/* Building 4: AITU Block C1.2 (IT & Software Engineering) */}
              <g onClick={() => handleSelectBuilding(CAMPUS_BUILDINGS[1])} className="cursor-pointer">
                <polygon points="150,470 230,440 270,465 190,495" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="150,470 190,495 190,525 150,500" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                <polygon points="190,495 270,465 270,495 190,525" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
              </g>
            </svg>

            {/* Labels overlay */}
            <div className="absolute top-[205px] left-[70px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-full shadow-md border border-blue-200">
              <Navigation className="w-3.5 h-3.5 text-blue-600 fill-blue-600 rotate-45" />
              <span className="text-[10px] font-bold text-slate-800 whitespace-nowrap">
                User's location
              </span>
            </div>

            <div className="absolute top-[170px] left-[270px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
              AITU Library
            </div>

            <div className="absolute top-[365px] left-[110px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
              AITU Block C1.1
            </div>

            <div className="absolute top-[345px] left-[300px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
              AITU Block C1.3
            </div>

            <div className="absolute top-[490px] left-[200px] -translate-x-1/2 -translate-y-1/2 z-10 bg-white/90 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 text-[10px] font-semibold text-slate-700 pointer-events-none">
              AITU Block C1.2
            </div>
          </div>
        )}

        {/* Floating Callout Card matching screenshot */}
        {/* Classroom 1 / C1.1.301 details */}
        <div className="absolute bottom-4 left-3.5 right-14 sm:right-auto sm:w-56 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h5 className="text-xs font-bold text-slate-900 leading-tight">
                  Classroom {selectedRoomForNav || 'C1.1.301'}
                </h5>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Astana IT University • {selectedBuilding?.name || 'Block C1.1'}
              </p>
              <p className="text-[10px] font-medium text-slate-700 mt-1">
                Due: Class <span className="font-bold text-blue-700">{selectedRoomForNav || 'Room 301'}</span>
              </p>
              <p className="text-[9px] text-slate-400">Floor {activeFloor} • AITU Campus</p>
            </div>
          </div>

          <div className="mt-2.5 flex gap-1.5">
            <button
              onClick={() => {
                setIsNavigating(true);
                setMapMode('aitumap');
              }}
              className="flex-1 bg-[#18458b] hover:bg-blue-900 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </button>

            <a
              href="https://yuujiso.github.io/aitumap/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center transition-colors"
              title="Open full AITU Map in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Floating Map Tools (Right Column) matching the mockup */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 z-30">
          {/* User Location Button */}
          <button
            onClick={() => {
              setZoomLevel(1);
              setIsNavigating(true);
            }}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title="Locate Me / Center"
          >
            <Navigation className="w-4 h-4 text-blue-600 fill-blue-600" />
          </button>

          {/* Building Directory List Button */}
          <button
            onClick={() => setShowBuildingList(!showBuildingList)}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title="AITU Buildings & Blocks"
          >
            <ListFilter className="w-4 h-4" />
          </button>

          {/* Zoom In & Out */}
          <button
            onClick={() => handleZoom(0.2)}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-t-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-b-xl shadow-md border-x border-b border-slate-200 -mt-2 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Floor Level Switcher (F1, F2, F3) */}
          <button
            onClick={() => setActiveFloor((prev) => (prev % 3) + 1)}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title={`Floor Level: ${activeFloor}`}
          >
            <div className="flex flex-col items-center">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[8px] font-bold leading-none mt-0.5">F{activeFloor}</span>
            </div>
          </button>

          {/* Reset Orientation */}
          <button
            onClick={() => setZoomLevel(1)}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
            title="Reset Orientation"
          >
            <Compass className="w-4 h-4 text-rose-500" />
          </button>
        </div>

      </div>

      {/* Slide-over Building & Room Directory */}
      {showBuildingList && (
        <div className="absolute inset-x-0 bottom-0 top-[120px] bg-white rounded-t-3xl shadow-2xl z-40 p-5 flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">AITU Campus Directory</h4>
              <p className="text-xs text-slate-400">Astana IT University Blocks and Classrooms</p>
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
