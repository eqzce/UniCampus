import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Send, X, Sparkles, MapPin } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AIAssistantModal: React.FC = () => {
  const { isAIAssistantOpen, setIsAIAssistantOpen, navigateToClassroom, student } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: `Hello ${student.name}! I am your UniCampus Academic Advisor. I can help with scholarship requirements, exam deadlines, and navigating campus. What would you like to know?`,
      timestamp: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  if (!isAIAssistantOpen) return null;

  const quickPrompts = [
    { label: 'Scholarship status & GPA target', query: 'What GPA do I need to keep my scholarship?' },
    { label: 'Deadlines this week', query: 'What are my deadlines for this week?' },
    { label: 'Directions to Room 301', query: 'How do I get to Room 301 for Physics?' },
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');

    // Generate smart response based on assignments specs
    setTimeout(() => {
      let reply = "I'm checking university records for you...";
      const lower = text.toLowerCase();

      if (lower.includes('scholarship') || lower.includes('gpa')) {
        reply = `Your current GPA is ${student.gpa} under the Presidential Scholarship. To maintain 100% tuition coverage, your cumulative GPA must stay above 3.50. You currently have a solid safety margin of +0.28!`;
      } else if (lower.includes('deadline') || lower.includes('report') || lower.includes('assignment')) {
        reply = `You have 3 upcoming tasks: 1) Physics Lab Report (Due Tomorrow), 2) History Essay (Due in 3 days), and 3) Systems Engineering Report (Due in 5 days). I recommend starting the Physics Lab Report today!`;
      } else if (lower.includes('room 301') || lower.includes('physics') || lower.includes('where')) {
        reply = `Room 301 is located on the 3rd floor of the Science Building. Would you like me to open the map route for you?`;
      } else {
        reply = `I have logged your academic inquiry: "${text}". You can check upcoming classes on the Schedule tab or review your grades in the Assignments tab.`;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: reply,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col h-[560px] overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-[#18458b] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                UniCampus AI Advisor
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h3>
              <p className="text-[10px] text-blue-200">24/7 Academic & Scholarship Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsAIAssistantOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#18458b] text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 shadow-xs border border-slate-100 rounded-tl-xs'
                }`}
              >
                {msg.text}
                {msg.text.includes('Room 301') && msg.sender === 'ai' && (
                  <button
                    onClick={() => {
                      setIsAIAssistantOpen(false);
                      navigateToClassroom('Room 301');
                    }}
                    className="mt-2 flex items-center gap-1 bg-blue-50 text-[#18458b] font-bold px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 text-[11px]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Open Map to Room 301
                  </button>
                )}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.query)}
              className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-full whitespace-nowrap border border-slate-200 transition-colors flex-shrink-0"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about scholarship, deadlines, classrooms..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
          />
          <button
            onClick={() => handleSendMessage()}
            className="w-9 h-9 rounded-full bg-[#18458b] hover:bg-blue-900 text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
