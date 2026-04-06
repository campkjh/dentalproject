import { CalendarDays, MessageCircle, Heart, CreditCard } from 'lucide-react';

const icons = {
  calendar: CalendarDays,
  message: MessageCircle,
  heart: Heart,
  payment: CreditCard,
};

interface EmptyStateProps {
  icon?: keyof typeof icons;
  message: string;
}

export default function EmptyState({ icon = 'calendar', message }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 bounce-in">
        <Icon size={28} className="text-[#7C3AED]" />
      </div>
      <p className="text-gray-500 fade-in-up">{message}</p>
    </div>
  );
}
