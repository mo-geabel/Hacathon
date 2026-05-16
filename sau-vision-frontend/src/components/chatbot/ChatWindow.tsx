import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import RoomSuggestionCard from './RoomSuggestionCard';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { Room } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeminiResult {
  matchedLabId: string | null;
  confidenceScore: number;
  reason: string;
  detectedRequirements: string[];
}

interface Suggestion {
  room: Room;
  date: string;
  time: string;
  attendees: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: Suggestion;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a rough attendee count from the user's text (e.g. "15 people") */
function parseAttendees(text: string): number | undefined {
  const m = text.match(/(\d+)\s*(people|students|persons|attendees|capacity)/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Extract a date string: "tomorrow" → ISO date, or today */
function parseDate(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/** Extract a time string like "4 PM", "16:00" → "16:00" */
function parseTime(text: string): string {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const mins = m[2] || '00';
    const isPm = m[3].toLowerCase() === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${mins}`;
  }
  return '14:00';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      content: `Hi${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! I'm your SAÜ-Vision assistant powered by Gemini AI. Tell me what you need — e.g. "I need a computer lab for 20 students with MATLAB tomorrow at 2 PM".`,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addMessage = (msg: Omit<Message, 'id'>) =>
    setMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random()}`, ...msg }]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    addMessage({ role: 'user', content: userText });
    setInput('');
    setIsTyping(true);

    try {
      // ── 1. Parse helpers (date, time, attendees) ────────────────────────────
      const attendees = parseAttendees(userText);
      const date = parseDate(userText);
      const time = parseTime(userText);

      // ── 2. Call the real Gemini NL endpoint on our backend ──────────────────
      const { data } = await api.post('/bookings/parse', {
        prompt: userText,
        expectedAttendees: attendees,
      });

      const result: GeminiResult = data.geminiResult;

      // ── 3. No match found ───────────────────────────────────────────────────
      if (!result.matchedLabId) {
        addMessage({
          role: 'assistant',
          content: result.reason || "I couldn't find a room that matches your requirements. Could you try a different time or adjust the capacity?",
        });
        return;
      }

      // ── 4. Fetch the matched lab details ────────────────────────────────────
      const { data: lab } = await api.get(`/labs/${result.matchedLabId}`);

      const room: Room = {
        id: lab.id,
        name: lab.name,
        capacity: lab.capacity,
        hardware: Array.isArray(lab.aiTags) ? lab.aiTags : [],
        status: lab.status,
        occupancyPercent: lab.capacity > 0
          ? Math.round((lab.currentOccupancy / lab.capacity) * 100)
          : 0,
        location: lab.faculty
          ? `${lab.faculty.name}, Floor ${lab.floor}, Room ${lab.roomNumber}`
          : `Floor ${lab.floor}, Room ${lab.roomNumber}`,
      };

      // ── 5. Show Gemini's reasoning + room suggestion card ───────────────────
      addMessage({
        role: 'assistant',
        content: result.reason,
        suggestion: { room, date, time, attendees: attendees ?? 1 },
      });

    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      addMessage({
        role: 'assistant',
        content: serverMsg || 'Sorry, I had trouble processing that. Please try again.',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleBook = async (roomId: string, date: string, time: string, attendees: number) => {
    setIsTyping(true);
    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hours, mins] = time.split(':').map(Number);
      const scheduledStart = new Date(year, month - 1, day, hours, mins);
      const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000); // 2-hour default

      await api.post('/bookings', {
        labId: roomId,
        title: 'AI Assistant Booking',
        description: 'Requested via SAÜ-Vision AI Assistant',
        expectedAttendees: attendees,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
      });

      addMessage({
        role: 'assistant',
        content: '🎉 Booking request submitted! Once approved by the faculty admin, you\'ll find your QR check-in code in your Dashboard.',
      });
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      addMessage({
        role: 'assistant',
        content: serverMsg || 'There was an error submitting your booking. Please try again.',
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-navy-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 bg-navy-800 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-electric-500/20 flex items-center justify-center border border-electric-500/30">
          <Sparkles className="w-5 h-5 text-electric-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold">AI Assistant</h2>
          <p className="text-xs text-electric-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Powered by Gemini
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2">
            <MessageBubble
              content={msg.content}
              role={msg.role}
              timestamp={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            {msg.suggestion && (
              <div className="ml-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <RoomSuggestionCard
                  room={msg.suggestion.room}
                  date={msg.suggestion.date}
                  time={msg.suggestion.time}
                  attendees={msg.suggestion.attendees}
                  onBook={handleBook}
                />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 items-center text-gray-400 text-sm animate-pulse ml-12">
            <Loader2 className="w-4 h-4 animate-spin" /> Gemini is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-navy-800 border-t border-white/5">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I need a lab with MATLAB for 20 students tomorrow at 2 PM"
            className="w-full bg-navy-900 border border-white/10 rounded-full py-3.5 pl-5 pr-14 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent placeholder-gray-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 bg-electric-500 text-white rounded-full hover:bg-electric-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
