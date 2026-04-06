'use client';

interface TabBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'pill' | 'underline' | 'outline';
  counts?: Record<string, number>;
}

export default function TabBar({ tabs, activeTab, onTabChange, variant = 'pill', counts }: TabBarProps) {
  if (variant === 'underline') {
    return (
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all duration-300 ${
              activeTab === tab
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-400'
            }`}
          >
            {tab}
            {counts?.[tab] !== undefined && ` ${counts[tab]}`}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'outline') {
    return (
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
              activeTab === tab
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-400'
            }`}
          >
            {tab}
            {counts?.[tab] !== undefined && ` (${counts[tab]})`}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 btn-press ${
            activeTab === tab
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          {tab}
          {counts?.[tab] !== undefined && ` ${counts[tab]}`}
        </button>
      ))}
    </div>
  );
}
