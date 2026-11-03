'use client';

import { useLayoutEffect, useRef } from 'react';
import { currencyDigits, currencySelection, formatCurrency } from '@/lib/currency-input';

export default function CurrencyInput({ value, onValueChange, readOnly = false, placeholder = '0' }: {
  value: string;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (cursorRef.current !== null && document.activeElement === inputRef.current) {
      inputRef.current?.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });
  return <input
    ref={inputRef}
    type="text"
    inputMode="numeric"
    value={formatCurrency(value)}
    readOnly={readOnly}
    placeholder={placeholder}
    onChange={(event) => {
      const input = event.currentTarget;
      const { formatted, cursor } = currencySelection(input.value, input.selectionStart ?? input.value.length);
      cursorRef.current = cursor;
      input.value = formatted;
      input.setSelectionRange(cursor, cursor);
      onValueChange?.(currencyDigits(formatted));
    }}
  />;
}
