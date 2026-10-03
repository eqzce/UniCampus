import React, { useState } from 'react';
import { Plus, Bot, DoorClosed, RefreshCw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FloatingActionButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { setIsAIAssistantOpen, setIsBookingOpen, setIsNotificationsOpen } = useApp();

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="absolute bottom-16 right-4 z-30 flex flex-col items-end pointer-events-none">
      {/* Expanded Quick Menu */}
      {isOpen && (
        <div className="mb-3 flex flex-col items-end gap-2 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
          <button
            onClick={() => handleAction(() => setIsAIAssistantOpen(true))}
            className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Assistant</span>
          </button>

          <button
            onClick={() => handleAction(() => setIsBookingOpen(true))}
            className="flex items-center gap-2 bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg hover:bg-blue-800 active:scale-95 transition-all"
          >
            <DoorClosed className="w-4 h-4" />
            <span>Book Study Room</span>
          </button>

          <button
            onClick={() => handleAction(() => setIsNotificationsOpen(true))}
            className="flex items-center gap-2 bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg hover:bg-slate-900 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Offline Sync & Alerts</span>
          </button>
        </div>
      )}

      {/* Main (+) Floating Action Button - firmly anchored to the right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 pointer-events-auto shrink-0 self-end"
        title="Quick Actions"
        aria-label="Add or Quick Actions"
      >
        {isOpen ? (
          <X className="w-6 h-6 stroke-[2.5]" />
        ) : (
          <Plus className="w-6 h-6 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
};
