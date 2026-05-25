import { MessageCircle, Heart, CreditCard, Clock } from 'lucide-react';

const lucideIcons = {
  message: MessageCircle,
  heart: Heart,
  payment: CreditCard,
  clock: Clock,
};

type IconName = 'calendar' | 'point' | keyof typeof lucideIcons;

const svgIcons: Partial<Record<IconName, string>> = {
  calendar: '/icons/calendar-empty.svg',
  point: '/icons/point-empty.svg',
};

interface EmptyStateProps {
  icon?: IconName;
  message: string;
}

export default function EmptyState({ icon = 'calendar', message }: EmptyStateProps) {
  const svgSrc = svgIcons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {svgSrc ? (
        <img
          src={svgSrc}
          alt=""
          width={62}
          height={62}
          className="mb-4 bounce-in"
        />
      ) : (
        (() => {
          const Icon = lucideIcons[icon as keyof typeof lucideIcons];
          return (
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 bounce-in">
              <Icon size={28} className="text-[#8037FF]" />
            </div>
          );
        })()
      )}
      <p className="text-gray-500 fade-in-up">{message}</p>
    </div>
  );
}
