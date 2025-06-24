
import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { LoadingSpinner } from './LoadingSpinner';
import { SendIcon, NutriKickIcon, MicrophoneIcon, StopCircleIcon, CameraIcon } from './Icons';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (input: string) => void; // For text messages
  isLoading: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  isListening: boolean; 
  onToggleListening: () => void; 
  micPermissionError: string | null;
  chatInputRef: React.RefObject<HTMLInputElement>;
  onOpenCamera: () => void; // New prop to handle opening camera
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isLoading,
  chatContainerRef,
  isListening, 
  onToggleListening, 
  micPermissionError,
  chatInputRef,
  onOpenCamera, // Destructure new prop
}) => {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (isListening) {
      setInput(''); 
      if (chatInputRef.current) {
        chatInputRef.current.value = '';
      }
    }
  }, [isListening, chatInputRef]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentInputValue = chatInputRef.current?.value || input;
    if (currentInputValue.trim() && !isLoading && !isListening) { 
      onSendMessage(currentInputValue); 
      setInput('');
      if (chatInputRef.current) chatInputRef.current.value = '';
      chatInputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (chatInputRef.current) {
        chatInputRef.current.value = e.target.value;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-700">
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
          />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length -1].sender === 'user' && (
          <div className="flex justify-start animate-fadeIn">
             <div className={`flex items-start max-w-md lg:max-w-lg flex-row space-x-2 rtl:space-x-reverse`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-slate-800 shadow-md`}>
                    <NutriKickIcon className="text-2xl" />
                </div>
                <div className="bg-slate-600 text-slate-300 p-3 rounded-xl rounded-bl-none shadow-md">
                    <LoadingSpinner size="sm" color="text-slate-400"/> <span className="ml-2 text-sm text-slate-400">Nutri-Kick AI está procesando... 🤔</span>
                </div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-600 bg-slate-800">
        {micPermissionError && (
            <p className="text-xs text-red-400 mb-1 text-center animate-fadeIn">{micPermissionError}</p>
        )}
        {isListening && ( 
            <p className="text-xs text-orange-400 mb-1 text-center animate-fadeIn">Grabando audio... Habla ahora 🎤</p>
        )}
        <div className="flex items-center space-x-2">
          <input
            ref={chatInputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={isListening ? "Grabando audio..." : "Escribe o usa los iconos..."}
            className="flex-grow p-3 bg-slate-600 border border-slate-500 text-slate-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-shadow text-sm shadow-sm placeholder-slate-400"
            disabled={isLoading || isListening} 
            aria-label="Mensaje"
          />
          <button
            type="button"
            onClick={onToggleListening} 
            disabled={isLoading} 
            className={`p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 shadow-sm hover:shadow-md ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 mic-pulse' 
                : 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-600'
            } disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed`}
            aria-label={isListening ? "Detener grabación" : "Iniciar grabación de voz"}
          >
            {isListening ? <StopCircleIcon className="w-6 h-6"/> : <MicrophoneIcon className="w-6 h-6"/>}
          </button>
           <button
            type="button"
            onClick={onOpenCamera}
            disabled={isLoading || isListening}
            className="p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 shadow-sm hover:shadow-md bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-600 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed"
            aria-label="Abrir cámara para enviar imagen"
          >
            <CameraIcon className="w-6 h-6"/>
          </button>
          <button
            type="submit"
            disabled={isLoading || isListening || (!input.trim() && (!chatInputRef.current || !chatInputRef.current.value.trim()))}
            className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-slate-800 shadow-sm hover:shadow-md"
            aria-label="Enviar mensaje de texto"
          >
            {isLoading && !isListening ? <LoadingSpinner size="sm" color="text-white"/> : <SendIcon className="w-6 h-6"/>}
          </button>
        </div>
      </form>
    </div>
  );
};