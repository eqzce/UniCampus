import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Search, Plus, Minus, X, ChevronDown, Check, Building2, MapPin } from 'lucide-react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { CLASSROOM_LOCATIONS } from '../../data/mockData';
import { BUILDING_MAPS, floorFromQuery, parseRoom } from './buildings';
import type { CampusBuildingMap, ParsedRoom } from './buildings';

const SEARCH_CLASS = 'room-map-group-search-target';
const SELECTED_CLASS = 'room-map-group-selected';

export const CampusMapScreen: React.FC = () => {
  const { selectedRoomForNav } = useApp();

  const initialRoom = useMemo(() => {
    if (!selectedRoomForNav) return null;
    const roomId = CLASSROOM_LOCATIONS[selectedRoomForNav]?.roomNumber ?? selectedRoomForNav;
    return parseRoom(roomId);
  }, [selectedRoomForNav]);

  const [buildingId, setBuildingId] = useState<CampusBuildingMap['id']>('main');
  const [floor, setFloor] = useState<number>(() => initialRoom?.floor ?? 1);
  const [query, setQuery] = useState<string>(() => initialRoom?.id ?? '');
  const [selectedRoom, setSelectedRoom] = useState<ParsedRoom | null>(() => initialRoom);
  const [isBuildingMenuOpen, setIsBuildingMenuOpen] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  const building = BUILDING_MAPS.find((b) => b.id === buildingId)!;
  const floorNumbers = useMemo(
    () => Object.keys(building.floors).map(Number).sort((a, b) => b - a),
    [building]
  );
  const FloorPlan: React.FC | undefined = building.floors[floor];

  // "Show on Map" from Schedule / Dashboard -> open that room
  useEffect(() => {
    if (!selectedRoomForNav) return;
    const roomId = CLASSROOM_LOCATIONS[selectedRoomForNav]?.roomNumber ?? selectedRoomForNav;
    const parsed = parseRoom(roomId);
    setBuildingId('main');
    setQuery(parsed.id);
    setSelectedRoom(parsed);
    if (parsed.floor) setFloor(parsed.floor);
  }, [selectedRoomForNav]);

  // Typing a room number jumps to its floor
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedRoom(null);
    const f = floorFromQuery(value);
    if (f && building.floors[f]) setFloor(f);
  };

  // Apply search / selection highlight to the SVG after each render of the floor
  useEffect(() => {
    const root = mapRef.current;
    if (!root) return;
    const q = query.trim().toUpperCase();
    root.querySelectorAll<SVGGElement>('[data-name]').forEach((el) => {
      const name = (el.getAttribute('data-name') || '').toUpperCase();
      el.classList.toggle(SEARCH_CLASS, q.length > 0 && name.includes(q));
      el.classList.toggle(SELECTED_CLASS, !!selectedRoom && name.split('|')[0] === selectedRoom.id.toUpperCase());
    });
  }, [query, selectedRoom, floor, buildingId]);

  const handleMapClick = (e: React.MouseEvent) => {
    // Ignore clicks that were actually pans
    const start = pointerDown.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;

    const target = (e.target as Element).closest('[data-name]');
    const isRoom = target?.closest('.map-groups-rooms, .map-groups-rooms-vk');
    if (!target || !isRoom) {
      setSelectedRoom(null);
      return;
    }
    const parsed = parseRoom(target.getAttribute('data-name') || '');
    setSelectedRoom({ ...parsed, floor: parsed.floor ?? floor });
  };

  const selectBuilding = (id: CampusBuildingMap['id']) => {
    setBuildingId(id);
    setIsBuildingMenuOpen(false);
    setSelectedRoom(null);
    const b = BUILDING_MAPS.find((x) => x.id === id)!;
    const first = Object.keys(b.floors).map(Number).sort()[0];
    if (first) setFloor(first);
  };

  const selectFloor = (f: number) => {
    setFloor(f);
    setSelectedRoom(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      <Header title="CAMPUS MAP" subtitle={building.name} />

      {/* Search + building switcher */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 z-20">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск кабинета, напр. 105"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            disabled={floorNumbers.length === 0}
            className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#18458b]/20 disabled:opacity-60"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsBuildingMenuOpen((o) => !o)}
            className="flex items-center gap-1 bg-[#18458b] text-white text-[11px] font-semibold pl-2.5 pr-2 py-2 rounded-full shadow-sm hover:bg-[#14366d] transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Другие корпусы</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBuildingMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isBuildingMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-100 p-1 z-40">
              {BUILDING_MAPS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => selectBuilding(b.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                    b.id === buildingId ? 'bg-blue-50 text-[#18458b] font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{b.name}</span>
                  {b.id === buildingId && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map viewport */}
      <div className="flex-1 relative overflow-hidden" onClick={() => isBuildingMenuOpen && setIsBuildingMenuOpen(false)}>
        {FloorPlan ? (
          <div
            ref={mapRef}
            className="w-full h-full"
            onPointerDown={(e) => (pointerDown.current = { x: e.clientX, y: e.clientY })}
            onClick={handleMapClick}
          >
            <TransformWrapper
              ref={zoomRef}
              initialScale={1.3}
              minScale={0.8}
              maxScale={8}
              centerOnInit
              doubleClick={{ disabled: true }}
            >
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: '100%', height: '100%' }}
              >
                <FloorPlan />
              </TransformComponent>
            </TransformWrapper>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-5 text-center border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">{building.name}</p>
              <p className="text-xs text-slate-400 mt-1">Карта этого корпуса пока отсутствует.</p>
            </div>
          </div>
        )}

        {/* Floor switcher + zoom */}
        {FloorPlan && (
          <div className="absolute right-3 top-3 flex flex-col gap-2 z-30">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
              {floorNumbers.map((f) => (
                <button
                  key={f}
                  onClick={() => selectFloor(f)}
                  className={`w-9 h-9 text-xs font-bold transition-colors ${
                    f === floor ? 'bg-[#18458b] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  title={`Этаж ${f}`}
                >
                  F{f}
                </button>
              ))}
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
              <button
                onClick={() => zoomRef.current?.zoomIn()}
                className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                title="Увеличить"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-200" />
              <button
                onClick={() => zoomRef.current?.zoomOut()}
                className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                title="Уменьшить"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Selected room card */}
        {selectedRoom && FloorPlan && (
          <div className="absolute bottom-4 left-3.5 right-16 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-900 leading-tight">{selectedRoom.label}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {building.name}
                    {selectedRoom.block && ` · Блок ${selectedRoom.block}`}
                    {` · Этаж ${selectedRoom.floor ?? floor}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
