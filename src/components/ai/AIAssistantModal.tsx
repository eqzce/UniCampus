import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Send, X, Sparkles, MapPin, GraduationCap, CheckSquare, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  recommendedRoom?: string | null;
  recommendedTab?: string | null;
  provider?: string;
}

export const AIAssistantModal: React.FC = () => {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    navigateToClassroom,
    setActiveTab,
    student,
    aiQuota,
    askAI,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: `Hello ${student.name}! I am your UniCampus AI Academic Advisor. Your live GPA is ${student.gpa.toFixed(
        2
      )} (Standard Scholarship >= 2.33, Increased >= 3.66). Ask me about your next class, deadlines, scholarship calculation, or highlighting a room on the campus map.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isAIAssistantOpen) return null;

  const quickPrompts = [
    { label: 'Next class & room', query: 'What is my next class and where is the room?' },
    { label: 'GPA & 2.33/3.66 stipend', query: 'How to calculate GPA and keep my scholarship?' },
    { label: 'Deadlines this week', query: 'When are my assignments due?' },
    { label: 'Highlight C1.1.320', query: 'Where is room C1.1.320 on the campus map?' },
  ];

  const quotaPct = Math.min(
    100,
    Math.round((aiQuota.usedTokens / Math.max(1, aiQuota.monthlyQuota)) * 100)
  );

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const result = await askAI(text);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now() + 1}`,
        sender: 'ai',
        text: result.reply,
        timestamp: 'Just now',
        recommendedRoom: result.recommendedRoom,
        recommendedTab: result.recommendedTab,
        provider: result.provider,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col h-[580px] overflow-hidden border border-slate-100">
        {/* Header + AI Token Quota Meter */}
        <div className="bg-[#18458b] text-white p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  UniCampus AI Advisor
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <p className="text-[10px] text-blue-200">
                  Contextual GPA, Schedule & AITU Indoor Advisor
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAIAssistantOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Close AI Advisor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white/10 rounded-xl px-2.5 py-1.5 text-[10px]">
            <div className="flex items-center justify-between text-blue-100 mb-1">
              <span className="font-semibold">{aiQuota.tier}</span>
              <span className="font-bold text-white">
                {aiQuota.usedTokens.toLocaleString()} / {aiQuota.monthlyQuota.toLocaleString()} tokens ({aiQuota.queriesCount} queries)
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-300 rounded-full transition-all"
                style={{ width: `${Math.max(4, quotaPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-[#18458b] text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 shadow-xs border border-slate-100 rounded-tl-xs'
                }`}
              >
                {msg.text}

                {msg.sender === 'ai' && (msg.recommendedRoom || msg.recommendedTab === 'grades' || msg.recommendedTab === 'assignments') && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.recommendedRoom && (
                      <button
                        onClick={() => {
                          setIsAIAssistantOpen(false);
                          navigateToClassroom(msg.recommendedRoom!);
                        }}
                        className="flex items-center gap-1 bg-blue-50 text-[#18458b] font-bold px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 text-[11px] cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        Open Map to {msg.recommendedRoom}
                      </button>
                    )}

                    {msg.recommendedTab === 'grades' && (
                      <button
                        onClick={() => {
                          setIsAIAssistantOpen(false);
                          setActiveTab('grades');
                        }}
                        className="flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 text-[11px] cursor-pointer"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                        Open GPA Simulator
                      </button>
                    )}

                    {msg.recommendedTab === 'assignments' && (
                      <button
                        onClick={() => {
                          setIsAIAssistantOpen(false);
                          setActiveTab('assignments');
                        }}
                        className="flex items-center gap-1 bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 text-[11px] cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                        Open Tasks Tab
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
                {msg.provider ? ` · ${msg.provider}` : ''}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#18458b]" />
              <span>Analyzing schedule, GPA & deadlines...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.query)}
              className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-full whitespace-nowrap border border-slate-200 transition-colors flex-shrink-0 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about scholarship, deadlines, rooms..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading}
            aria-label="Send message"
            className="w-9 h-9 rounded-full bg-[#18458b] hover:bg-blue-900 text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
