

import React from 'react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { UserIcon, NutriKickIcon, ThumbUpIcon, ThumbDownIcon } from './Icons'; 

interface ChatMessageProps {
  message: Message;
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
}

const isImageDataURI = (text: string): boolean => {
  return text.startsWith('data:image');
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onFeedback }) => {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  const handleFeedbackClick = (feedbackType: 'up' | 'down') => {
    if (onFeedback && message.id) {
      onFeedback(message.id, feedbackType);
    }
  };

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
          <div className={`flex items-center mt-1.5 ${isUser ? 'justify-end': 'justify-between'}`}>
            <p className={`text-xs ${isUser ? 'text-sky-200' : 'text-slate-400'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {isAI && onFeedback && (
              <div className="flex space-x-1.5 ml-2">
                <button
                  onClick={() => handleFeedbackClick('up')}
                  className={`p-1 rounded-full transition-colors duration-150 focus:outline-none 
                              ${message.feedback === 'up' ? 'text-green-500 bg-green-900/50' : 'text-slate-400 hover:text-green-400 hover:bg-slate-700'}`}
                  aria-label="Me gusta esta respuesta"
                  title="Me gusta"
                >
                  <ThumbUpIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedbackClick('down')}
                  className={`p-1 rounded-full transition-colors duration-150 focus:outline-none 
                              ${message.feedback === 'down' ? 'text-red-500 bg-red-900/50' : 'text-slate-400 hover:text-red-400 hover:bg-slate-700'}`}
                  aria-label="No me gusta esta respuesta"
                  title="No me gusta"
                >
                  <ThumbDownIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};