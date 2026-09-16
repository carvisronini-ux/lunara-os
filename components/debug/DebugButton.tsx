'use client';

import { useState } from 'react';
import { DebugPanel } from './DebugPanel';
import '@/styles/pixel.css';

export function DebugButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Debug Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-red-600 border-2 border-white px-3 py-2 text-xs hover:bg-red-700 transition-colors pixel-font shadow-lg"
        title="Open Debug Panel"
      >
        🐛 DEBUG
      </button>

      {/* Debug Panel */}
      <DebugPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}