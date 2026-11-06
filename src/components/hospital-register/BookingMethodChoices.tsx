'use client';

import { BOOKING_METHODS, type BookingMethod } from '@/lib/booking-methods';

export default function BookingMethodChoices({ value, onChange, disabled = false }: {
  value: BookingMethod[];
  onChange: (value: BookingMethod[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-3 text-[16px] font-semibold text-[#333D4B]">그 외 예약방식</legend>
      {BOOKING_METHODS.filter((method) => method !== '앱결제').map((method) => (
        <label key={method} className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-[#F2F4F6] px-4 py-4 text-[16px] text-[#333D4B]">
          {method}
          <input type="checkbox" checked={value.includes(method)} className="h-5 w-5 accent-[#2F6FE4]"
            onChange={(event) => onChange(event.target.checked ? [...value, method] : value.filter((item) => item !== method))} />
        </label>
      ))}
    </fieldset>
  );
}
