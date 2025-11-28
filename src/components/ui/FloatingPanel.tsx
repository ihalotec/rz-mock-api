
import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FloatingPanelProps {
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  children?: React.ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { w: number; h: number };
  icon: React.ReactNode;
  colorClass?: string;
}

export const FloatingPanel = ({
  title,
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  children,
  initialPosition = { x: 100, y: 100 },
  initialSize = { w: 400, h: 500 },
  icon,
  colorClass = "bg-primary"
}: FloatingPanelProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div 
        className={cn(
            "fixed z-50 flex items-center gap-2 p-2 rounded-lg shadow-lg border border-gray-700 cursor-move hover:bg-gray-800 transition-colors bg-gray-900 select-none", 
            colorClass.replace('bg-', 'border-')
        )}
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <div className={cn("p-1 rounded bg-opacity-20", colorClass)}>{icon}</div>
        <span className="text-xs font-semibold text-gray-300 pr-2">{title}</span>
        <button 
            onClick={(e) => { e.stopPropagation(); onMinimize(); }} 
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white ml-2"
            title="Restore"
        >
            <Maximize2 className="w-3 h-3" />
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Close"
        >
            <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed z-40 rounded-lg shadow-2xl border border-border bg-[#111] flex flex-col overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h
      }}
    >
      {/* Header */}
      <div 
        className="h-10 bg-[#16181d] border-b border-border flex items-center justify-between px-3 shrink-0 select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded bg-opacity-10", colorClass)}>{icon}</div>
            <span className="text-xs font-bold text-gray-300">{title}</span>
        </div>
        <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
             <button onClick={onMinimize} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                <Minus className="w-3 h-3" />
             </button>
             <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                <X className="w-3 h-3" />
             </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Resize Handle */}
      <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-center justify-center opacity-50 hover:opacity-100"
          onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = size.w;
              const startH = size.h;

              const onMove = (mv: MouseEvent) => {
                  setSize({
                      w: Math.max(300, startW + (mv.clientX - startX)),
                      h: Math.max(200, startH + (mv.clientY - startY))
                  });
              };
              const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
          }}
      >
          <div className="w-2 h-2 border-r border-b border-gray-500 rounded-br-sm" />
      </div>
    </div>
  );
};
