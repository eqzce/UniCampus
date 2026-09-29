import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DoorClosed, X, CheckCircle2 } from 'lucide-react';

export const RoomBookingModal: React.FC = () => {
  const { isBookingOpen, setIsBookingOpen } = useApp();
  const [selectedBuilding, setSelectedBuilding] = useState('Main Library');
  const [selectedRoom, setSelectedRoom] = useState('Study Room B');
  const [timeSlot, setTimeSlot] = useState('14:00 - 16:00');
  const [purpose, setPurpose] = useState('Group study session for CS101');
  const [isBooked, setIsBooked] = useState(false);

  if (!isBookingOpen) return null;

  const handleBook = () => {
    setIsBooked(true);
    setTimeout(() => {
      setIsBooked(false);
      setIsBookingOpen(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-slate-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
              <DoorClosed className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Room Booking</h3>
              <p className="text-[10px] text-slate-400">Reserve study spaces and labs</p>
            </div>
          </div>
          <button
            onClick={() => setIsBookingOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
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
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Select Campus Building
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
              >
                <option value="Main Library">Main Library</option>
                <option value="Science Building">Science Building</option>
                <option value="Student Center">Student Center</option>
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
                <option value="Study Room A">Study Room A (Cap. 6)</option>
                <option value="Study Room B">Study Room B (Cap. 8)</option>
                <option value="Room 301">Room 301 - Lab Area</option>
                <option value="Room 204">Room 204 - Seminar</option>
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
                <div className="text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 text-slate-800 font-medium">
                  Today (Oct 28)
                </div>
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

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsBookingOpen(false)}
                className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-[#18458b] text-white hover:bg-blue-900 transition-all shadow-sm active:scale-95"
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
