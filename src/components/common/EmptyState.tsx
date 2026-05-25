import { MessageCircle, Heart, CreditCard, Clock } from 'lucide-react';

const lucideIcons = {
  message: MessageCircle,
  heart: Heart,
  payment: CreditCard,
  clock: Clock,
};

type IconName = 'calendar' | 'point' | 'coupon' | keyof typeof lucideIcons;

const svgIcons: Partial<Record<IconName, string>> = {
  calendar: '/icons/calendar-empty.svg',
  point: '/icons/point-empty.svg',
  coupon: '/icons/coupon-empty.svg',
};

interface EmptyStateProps {
  icon?: IconName;
  message: string;
  subtitle?: string;
}

export default function EmptyState({ icon = 'calendar', message, subtitle }: EmptyStateProps) {
  const svgSrc = svgIcons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {svgSrc ? (
        <img
          src={svgSrc}
          alt=""
          width={62}
          height={62}
          className="mb-6 bounce-in"
        />
      ) : (
        (() => {
          const Icon = lucideIcons[icon as keyof typeof lucideIcons];
          return (
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6 bounce-in">
              <Icon size={28} className="text-[#8037FF]" />
            </div>
          );
        })()
      )}
      <p className="text-[22px] leading-[30px] font-bold text-[#2B313D] fade-in-up">
        {message}
      </p>
      {subtitle && (
        <p className="mt-2 text-[16px] leading-[22px] font-medium text-[#51535C] fade-in-up">
          {subtitle}
        </p>
      )}
    </div>
  );
}
