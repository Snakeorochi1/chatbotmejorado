
import React, { useState, useRef } from 'react';
import { Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { LoadingSpinner } from './LoadingSpinner';
import { SendIcon, NutriKickIcon } from './Icons';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (input: string) => void;
  isLoading: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading, chatContainerRef }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-700">
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length -1].sender === 'user' && (
          <div className="flex justify-start animate-fadeIn">
             <div className={`flex items-start max-w-md lg:max-w-lg flex-row space-x-2 rtl:space-x-reverse`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-slate-800 shadow-md`}>
                    <NutriKickIcon className="text-2xl" />
                </div>
                <div className="bg-slate-600 text-slate-300 p-3 rounded-xl rounded-bl-none shadow-md">
                    <LoadingSpinner size="sm" color="text-slate-400"/> <span className="ml-2 text-sm text-slate-400">Nutri-Kick AI está pensando... 🤔</span>
                </div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-600 bg-slate-800">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta aquí..."
            className="flex-grow p-3 bg-slate-600 border border-slate-500 text-slate-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-shadow text-sm shadow-sm placeholder-slate-400"
            disabled={isLoading}
            aria-label="Mensaje"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-slate-800 shadow-sm hover:shadow-md"
            aria-label="Enviar mensaje"
          >
            {isLoading ? <LoadingSpinner size="sm" color="text-white"/> : <SendIcon className="w-6 h-6"/>}
          </button>
        </div>
      </form>
    </div>
  );
};