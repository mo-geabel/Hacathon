import React from 'react';
import { cn } from '../../lib/utils';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  content: string | React.ReactNode;
  role: 'user' | 'assistant';
  timestamp?: string;
}

export default function MessageBubble({ content, role, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn("flex gap-4 w-full animate-slide-up", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
        isUser ? "bg-electric-500 text-foreground" : "bg-white dark:bg-navy-800 border border-border text-electric-400 glow-blue-sm"
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] flex flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
          isUser 
            ? "bg-electric-500 text-foreground rounded-tr-sm" 
            : "bg-white dark:bg-navy-800 border border-border text-gray-200 rounded-tl-sm shadow-sm"
        )}>
          {content}
        </div>
        
        {timestamp && (
          <span className="text-[10px] text-slate-400 dark:text-gray-500 px-1">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

