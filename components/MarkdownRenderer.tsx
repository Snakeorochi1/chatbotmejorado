

import React from 'react';

interface MarkdownRendererProps {
  markdown: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return [];

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pl-4 text-sm text-slate-200">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} dangerouslySetInnerHTML={{ __html: processLine(item, true) }}></li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const processLine = (line: string, isListItem: boolean = false): string => {
      let processedLine = line;
      // Bold: **text** or __text__
      processedLine = processedLine.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
      // Italics: *text* or _text_
      processedLine = processedLine.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
      return processedLine;
    };
    
    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={index} className="text-xl font-bold my-3 text-slate-50" dangerouslySetInnerHTML={{ __html: processLine(line.substring(2)) }}></h1>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={index} className="text-lg font-semibold my-2 text-slate-100" dangerouslySetInnerHTML={{ __html: processLine(line.substring(3)) }}></h2>);
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={index} className="text-base font-medium my-1 text-slate-200" dangerouslySetInnerHTML={{ __html: processLine(line.substring(4)) }}></h3>);
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        listItems.push(line.substring(2));
      } else if (line.trim() === '') { 
        flushList();
        const lastElement = elements.length > 0 ? elements[elements.length - 1] : null;
        if (lastElement && React.isValidElement(lastElement) && (lastElement as React.ReactElement).type === 'br') {
            // Do nothing if previous was already a br to avoid double <br>
        } else if (
            listItems.length === 0 && 
            elements.length > 0 && 
            !(
                React.isValidElement(elements[elements.length -1]) && 
                (((elements[elements.length -1] as React.ReactElement).type === 'h1' || 
                  (elements[elements.length -1] as React.ReactElement).type === 'h2' || 
                  (elements[elements.length -1] as React.ReactElement).type === 'h3'))
            )
        ) {
            elements.push(<br key={`br-${index}`} />);
        }
      } else {
        flushList();
        elements.push(<p key={index} className="my-1 text-sm" dangerouslySetInnerHTML={{ __html: processLine(line) }}></p>);
      }
    });

    flushList(); 

    const finalElements: React.ReactNode[] = [];
    for(let i = 0; i < elements.length; i++) {
        const currentElement = elements[i];
        const nextElement = elements[i + 1]; 

        const isCurrentBr = React.isValidElement(currentElement) && (currentElement as React.ReactElement).type === 'br';
        const isNextBr = nextElement && React.isValidElement(nextElement) && (nextElement as React.ReactElement).type === 'br';

        if (isCurrentBr && isNextBr) {
            // Skip current <br> if next is also a <br> to avoid double line breaks
        } else {
            finalElements.push(currentElement);
        }
    }
    // Remove leading <br /> tags if any
    while (finalElements.length > 0) {
        const firstElement = finalElements[0];
        if (React.isValidElement(firstElement) && (firstElement as React.ReactElement).type === 'br') {
            finalElements.shift();
        } else {
            break;
        }
    }

    return finalElements;
  };

  return <div className="prose prose-sm max-w-none break-words text-slate-200">{renderMarkdown(markdown)}</div>;
};