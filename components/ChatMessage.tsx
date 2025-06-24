
import React from 'react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { UserIcon, NutriKickIcon } from './Icons'; 

interface ChatMessageProps {
  message: Message;
}

const isImageDataURI = (text: string): boolean => {
  return text.startsWith('data:image');
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div id={`message-${message.id}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div className={`flex items-start max-w-md lg:max-w-lg ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row space-x-2'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${isUser ? 'bg-sky-600' : 'bg-slate-800'} shadow-md`}>
          {isUser ? <UserIcon className="w-5 h-5 text-white" /> : <NutriKickIcon className="text-2xl" />}
        </div>
        <div className={`relative px-4 py-3 rounded-xl shadow-md ${isUser ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-600 text-slate-100 rounded-bl-none'}`}>
          {isUser ? (
            isImageDataURI(message.text) ? (
              <img 
                src={message.text} 
                alt="Imagen enviada por el usuario" 
                className="max-w-xs max-h-60 rounded-md object-contain" // Constrain image size
              />
            ) : (
              <p className="text-sm break-words">{message.text}</p>
            )
          ) : (
            <MarkdownRenderer markdown={message.text} />
          )}
          <p className={`text-xs mt-1 ${isUser ? 'text-sky-200 text-right' : 'text-slate-400 text-left'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};