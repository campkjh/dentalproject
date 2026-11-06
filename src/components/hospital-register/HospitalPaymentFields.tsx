'use client';

import type { HospitalPaymentSettings } from '@/lib/hospital-payment-settings';

export default function HospitalPaymentFields({ value, onChange, disabled = false }: {
  value: HospitalPaymentSettings;
  onChange: (value: HospitalPaymentSettings) => void;
  disabled?: boolean;
}) {
  const fields = [
    { key: 'bankName', label: '은행명', placeholder: '은행명을 입력해 주세요', maxLength: 40 },
    { key: 'accountNumber', label: '계좌번호', placeholder: '계좌번호를 입력해 주세요', maxLength: 40 },
    { key: 'accountHolder', label: '예금주', placeholder: '예금주명을 입력해 주세요', maxLength: 60 },
  ] as const;
  return (
    <div className="space-y-5">
      <fieldset disabled={disabled}>
        <legend className="mb-3 text-[16px] font-semibold text-[#333D4B]">앱결제 신청 여부 <span className="text-[#F04452]">*</span></legend>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: '신청함', checked: true }, { label: '신청 안 함', checked: false }].map((option) => (
            <label key={option.label} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-[#F2F4F6] px-4 py-3 text-[15px] text-[#333D4B]">
              <input type="radio" name="app-payment-requested" checked={value.appPaymentRequested === option.checked}
                onChange={() => onChange({ ...value, appPaymentRequested: option.checked })} className="h-5 w-5 accent-[#2F6FE4]" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={disabled} className="space-y-4">
        <legend className="mb-3 text-[16px] font-semibold text-[#333D4B]">병원 정산 계좌{value.appPaymentRequested && <span className="text-[#F04452]"> *</span>}</legend>
        <p className="text-[14px] text-[#8B95A1]">앱결제를 신청하면 정산 계좌를 입력해 주세요.</p>
        {fields.map((field) => (
          <label key={field.key} className="block text-[15px] text-[#4E5968]">
            {field.label}
            <input type="text" inputMode={field.key === 'accountNumber' ? 'numeric' : 'text'}
              autoComplete="off" required={value.appPaymentRequested === true}
              maxLength={field.maxLength} value={value[field.key]} placeholder={field.placeholder}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
              className="mt-2 block h-12 w-full rounded-xl border border-[#E5E8EB] bg-white px-4 text-[16px] text-[#333D4B]" />
          </label>
        ))}
      </fieldset>
    </div>
  );
}
