/** 국내 대표번호·지역번호·휴대전화 번호를 표시용으로 구분한다. */
export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (/^1\d{7}$/.test(digits)) return digits.replace(/^(\d{4})(\d{4})$/, '$1-$2');
  if (/^02\d{7,8}$/.test(digits)) return digits.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3');
  if (/^0\d{9,10}$/.test(digits)) return digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
  return value;
}
