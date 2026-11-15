import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DoorClosed, X, CheckCircle2 } from 'lucide-react';

const STANDARD_ROOMS = [
  'Study Room A',
  'Study Room B',
  'C1.1.320',
  'C1.2.136',
  'C1.3.246',
  'C1.1.140',
  'C1.3.125',
  'C1.3.328',
];

export const RoomBookingModal: React.FC = () => {
  const {
    isBookingOpen,
    setIsBookingOpen,
    preselectedBookingRoom,
    setPreselectedBookingRoom,
    createRoomBooking,
    roomBookings,
  } = useApp();
  const [selectedBuilding, setSelectedBuilding] = useState('AITU Main Library');
  const [selectedRoom, setSelectedRoom] = useState('Study Room B');
  const [timeSlot, setTimeSlot] = useState('14:00 - 16:00');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState('Group study session for CS101');
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    if (!isBookingOpen || !preselectedBookingRoom) return;
    setSelectedRoom(preselectedBookingRoom.roomNumber);
    if (preselectedBookingRoom.buildingName) {
      setSelectedBuilding(preselectedBookingRoom.buildingName);
    } else if (preselectedBookingRoom.roomNumber.startsWith('C1.1')) {
      setSelectedBuilding('AITU Block C1.1');
    } else if (preselectedBookingRoom.roomNumber.startsWith('C1.2')) {
      setSelectedBuilding('AITU Block C1.2');
    } else if (preselectedBookingRoom.roomNumber.startsWith('C1.3')) {
      setSelectedBuilding('AITU Block C1.3');
    }
    setPurpose(`Study / lab reservation for ${preselectedBookingRoom.roomNumber}`);
  }, [isBookingOpen, preselectedBookingRoom]);

  const roomOptions = useMemo(() => {
    const base = [...STANDARD_ROOMS];
    if (selectedRoom && !base.includes(selectedRoom)) {
      base.unshift(selectedRoom);
    }
    return base;
  }, [selectedRoom]);

  if (!isBookingOpen) return null;

  const closeModal = () => {
    setPreselectedBookingRoom(null);
    setIsBookingOpen(false);
  };

  const handleBook = async () => {
    await createRoomBooking({
      roomNumber: selectedRoom,
      buildingName: selectedBuilding,
      date,
      timeSlot,
      purpose,
    });
    setIsBooked(true);
    setTimeout(() => {
      setIsBooked(false);
      closeModal();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-slate-100 relative max-h-[88vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
              <DoorClosed className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Room Booking</h3>
              <p className="text-[10px] text-slate-400">Reserve study spaces & AITU classrooms</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isBooked ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto animate-bounce" />
            <h4 className="text-sm font-bold text-slate-900">Room Reserved!</h4>
            <p className="text-xs text-slate-500">
              {selectedRoom} ({selectedBuilding}) booked for {timeSlot}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Select Campus Building
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
              >
                <option value="AITU Main Library">AITU Main Library</option>
                <option value="AITU Main Campus (C1)">AITU Main Campus (C1)</option>
                <option value="AITU Block C1.1">AITU Block C1.1</option>
                <option value="AITU Block C1.2">AITU Block C1.2</option>
                <option value="AITU Block C1.3">AITU Block C1.3</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Room Number
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
              >
                {roomOptions.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Time Slot
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 text-slate-800"
                >
                  <option value="10:00 - 12:00">10:00 - 12:00</option>
                  <option value="12:00 - 14:00">12:00 - 14:00</option>
                  <option value="14:00 - 16:00">14:00 - 16:00</option>
                  <option value="16:00 - 18:00">16:00 - 18:00</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 text-slate-800 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Purpose
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Study session / Project prep"
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 focus:outline-none"
              />
            </div>

            {roomBookings.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Recent Reservations ({roomBookings.length})
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {roomBookings.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-[10.5px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                    >
                      <span className="font-semibold text-slate-700 truncate">
                        {b.roomNumber} · {b.timeSlot}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full capitalize ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : b.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-[#18458b] text-white hover:bg-blue-900 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
