import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface WhatsAppBubbleProps {
  content: string;
  timestamp: string;
  isMe: boolean;
  showTail?: boolean;
}

export function WhatsAppBubble({ content, timestamp, isMe, showTail = true }: WhatsAppBubbleProps) {
  return (
    <div className={cn(
      "flex w-full mb-1 animate-in fade-in slide-in-from-bottom-1 duration-300",
      isMe ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "relative max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-xl shadow-sm",
        isMe 
          ? "bg-[#2b5278] rounded-tr-none text-[#ffffff]" 
          : "bg-[#182533] rounded-tl-none text-[#ffffff]",
        !showTail && (isMe ? "rounded-tr-xl" : "rounded-tl-xl")
      )}>
        {showTail && (
          <div className={cn(
            "absolute top-0 w-3 h-3",
            isMe 
              ? "-right-2 bg-[#2b5278] [clip-path:polygon(0_0,0_100%,100%_0)]" 
              : "-left-2 bg-[#182533] [clip-path:polygon(100%_0,100%_100%,0_0)]"
          )} />
        )}
        
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        
        <div className="flex justify-end items-center gap-1 mt-0.5">
          <span className="text-[10px] opacity-50 font-medium">
            {format(new Date(timestamp), "HH:mm")}
          </span>
          {isMe && (
            <div className="flex -space-x-1">
              <span className="text-[10px] text-blue-500 font-bold">✓</span>
              <span className="text-[10px] text-blue-500 font-bold">✓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
