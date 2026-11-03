export function currencyDigits(value: string) {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function formatCurrency(value: string) {
  return currencyDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Keep the cursor beside the same digit when grouping separators change. */
export function currencySelection(value: string, position: number) {
  const digitsAfter = value.slice(position).replace(/\D/g, '').length;
  const formatted = formatCurrency(value);
  const digitsBefore = Math.max(0, currencyDigits(value).length - digitsAfter);
  let cursor = 0;
  for (let left = digitsBefore; cursor < formatted.length && left > 0;) {
    if (/\d/.test(formatted[cursor])) left -= 1;
    cursor += 1;
  }
  return { formatted, cursor };
}
