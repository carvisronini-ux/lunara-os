'use client';

import { clsx } from 'clsx';

export type BuildingStatus = 'healthy' | 'busy' | 'warning' | 'critical';

interface IsoBuildingProps {
  name: string;
  displayName: string;
  department: string;
  status: BuildingStatus;
  agentCount: number;
  activeAgents: number;
  position: { x: number; y: number };
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

// ზუსტი გზები თქვენი ფაილების სტრუქტურის მიხედვით
const buildingImages: Record<string, string> = {
  executive_core: '/assets/tiny-swords/Buildings/Black Buildings/Castle.png',
  intelligence: '/assets/tiny-swords/Buildings/Black Buildings/Tower.png',
  strategy: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png',
  content: '/assets/tiny-swords/Buildings/Black Buildings/House1.png',
  creative: '/assets/tiny-swords/Buildings/Black Buildings/House2.png',
  resources: '/assets/tiny-swords/Buildings/Black Buildings/Barracks.png',
  quality: '/assets/tiny-swords/Buildings/Black Buildings/Archery.png',
  distribution: '/assets/tiny-swords/Buildings/Black Buildings/House3.png',
  analytics: '/assets/tiny-swords/Buildings/Black Buildings/House1.png',
  learning: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png',
};

const sizeMap = {
  small: 'w-20 h-20',
  medium: 'w-28 h-28',
  large: 'w-36 h-36',
};

export function IsoBuilding({
  name: _name, // ✅ შეცვლილია _name-ად, რათა TypeScript-მა არ იჩივლოს გამოუყენებლობაზე
  displayName,
  department,
  status,
  agentCount,
  activeAgents,
  position,
  size = 'medium',
  onClick,
}: IsoBuildingProps) {
  const image = buildingImages[department] || buildingImages.content;

  return (
    <div
      className={clsx('iso-building', sizeMap[size])}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onClick={onClick}
    >
      {/* Status Badge */}
      <div className={clsx('status-badge', `status-${status}`)} />

      {/* Building Label */}
      <div className="building-label">
        <span className="text-[8px] text-[#F5E6D3] lunara-font">{displayName}</span>
      </div>

      {/* Building Image */}
      <img
        src={image}
        alt={displayName}
        className="pixel-art w-full h-full object-contain"
      />

      {/* Agent Count */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#2C1810] border-2 border-[#F5E6D3] px-2 py-0.5 whitespace-nowrap">
        <span className="text-[7px] text-[#F5E6D3] pixel-font">
          {activeAgents}/{agentCount}
        </span>
      </div>
    </div>
  );
}