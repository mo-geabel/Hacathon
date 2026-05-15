import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import RoomSuggestionCard from './RoomSuggestionCard';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { extractIntentFromQuery } from '../../lib/gemini';
import { mockRooms, mockDelay } from '../../lib/mockData';
import type { Room } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: {
    room: Room;
    date: string;
    time: string;
  };
}

export default function ChatWindow() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      content: "Hi there! I'm your SAÜ-Vision assistant. Looking for a room? Just tell me what you need (e.g., 'I need a room with a projector for 15 people today at 4 PM')."
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: `msg-${Date.now()}`, role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // 1. Send query to "Gemini" to extract intent
      const intent = await extractIntentFromQuery(userMsg.content);
      
      // 2. Query rooms based on intent (mocking backend search)
      // Find a room that matches capacity and ideally hardware
      const availableRooms = mockRooms.filter(r => r.status !== 'maintenance' && r.status !== 'occupied');
      
      // Sort by capacity match (closest without going under)
      availableRooms.sort((a, b) => {
        const diffA = a.capacity - intent.capacity;
        const diffB = b.capacity - intent.capacity;
        if (diffA >= 0 && diffB < 0) return -1;
        if (diffB >= 0 && diffA < 0) return 1;
        return diffA - diffB;
      });

      const matchedRoom = availableRooms[0];

      if (matchedRoom) {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `I found a great match for your request! It accommodates up to ${matchedRoom.capacity} people and is available at ${intent.time}.`,
          suggestion: {
            room: matchedRoom,
            date: intent.date,
            time: intent.time
          }
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: "I couldn't find any available rooms that exactly match your requirements right now. Could we try a different time or smaller capacity?"
        }]);
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I had trouble processing that request. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBook = async (roomId: string) => {
    // Simulate booking API call
    await mockDelay(1500);
    
    // Create confirmation message
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `🎉 Success! Your booking request has been submitted to the faculty admin. Once approved, you'll receive your QR check-in code.`
    }]);
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
          </p>
        </div>
      </div>

      {/* Messages Area */}
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
                  onBook={handleBook}
                />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-2 items-center text-gray-400 text-sm animate-pulse ml-12">
            <Loader2 className="w-4 h-4 animate-spin" /> Assistant is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-navy-800 border-t border-white/5">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g., I need a room with GPUs for 15 people today at 4 PM"
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

