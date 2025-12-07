import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User } from 'lucide-react';
import { ChatMessage, Role } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  currentUserRole: Role;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, messages, onSendMessage, currentUserRole }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      role: currentUserRole,
      text: input,
      timestamp: Date.now()
    };

    onSendMessage(userMsg);
    setInput('');
    setIsTyping(true);

    // AI Response
    const responseText = await sendChatMessage(messages, input);
    
    const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        role: 'System',
        text: responseText,
        timestamp: Date.now()
    };
    
    onSendMessage(aiMsg);
    setIsTyping(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          Central Command
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-700 text-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] uppercase tracking-wider font-bold">
                 {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                 {msg.role}
              </div>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className="text-[10px] opacity-50 text-right mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
             <div className="flex justify-start">
               <div className="bg-slate-700 rounded-lg p-3 text-slate-400 text-xs italic flex items-center gap-2">
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
               </div>
             </div>
        )}
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
          />
          <button 
            onClick={handleSend}
            className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
