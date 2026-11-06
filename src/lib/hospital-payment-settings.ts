export type HospitalPaymentSettings = {
  appPaymentRequested: boolean | null;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export const EMPTY_PAYMENT_SETTINGS: HospitalPaymentSettings = {
  appPaymentRequested: null, bankName: '', accountNumber: '', accountHolder: '',
};

export function parseHospitalPaymentSettings(value: unknown): HospitalPaymentSettings | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.appPaymentRequested !== 'boolean') return null;
  if (typeof row.bankName !== 'string' || typeof row.accountNumber !== 'string' || typeof row.accountHolder !== 'string') return null;
  const bankName = row.bankName.trim();
  const accountNumber = row.accountNumber.replace(/[\s-]/g, '');
  const accountHolder = row.accountHolder.trim();
  const hasAccount = !!(bankName || accountNumber || accountHolder);
  if (bankName.length > 40 || accountHolder.length > 60) return null;
  if ((row.appPaymentRequested || hasAccount) && (!bankName || !accountHolder || !/^\d{6,30}$/.test(accountNumber))) return null;
  return { appPaymentRequested: row.appPaymentRequested, bankName, accountNumber, accountHolder };
}

export function paymentSettingsFromRow(row: Record<string, unknown> | null | undefined): HospitalPaymentSettings {
  if (!row) return { ...EMPTY_PAYMENT_SETTINGS };
  return {
    appPaymentRequested: typeof row.app_payment_requested === 'boolean' ? row.app_payment_requested : null,
    bankName: typeof row.bank_name === 'string' ? row.bank_name : '',
    accountNumber: typeof row.account_number === 'string' ? row.account_number : '',
    accountHolder: typeof row.account_holder === 'string' ? row.account_holder : '',
  };
}
