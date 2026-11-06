import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHospitalPaymentSettings, paymentSettingsFromRow } from '../src/lib/hospital-payment-settings';

const account = { appPaymentRequested: true, bankName: ' 테스트은행 ', accountNumber: '012-3456-7890', accountHolder: ' 테스트병원 ' };

test('앱결제 신청 여부는 명시적으로 선택하고 신청 시 계좌를 모두 입력한다', () => {
  assert.equal(parseHospitalPaymentSettings({ ...account, appPaymentRequested: null }), null);
  for (const key of ['bankName', 'accountNumber', 'accountHolder']) {
    assert.equal(parseHospitalPaymentSettings({ ...account, [key]: '' }), null);
  }
  assert.equal(parseHospitalPaymentSettings({ ...account, accountNumber: '123abc456' }), null);
  assert.equal(parseHospitalPaymentSettings({ ...account, accountNumber: 123456 }), null);
});

test('계좌번호의 앞자리 0을 보존하고 하이픈과 공백만 제거한다', () => {
  assert.deepEqual(parseHospitalPaymentSettings(account), {
    appPaymentRequested: true, bankName: '테스트은행', accountNumber: '01234567890', accountHolder: '테스트병원',
  });
});

test('앱결제 미신청은 빈 계좌가 가능하지만 입력했다면 완전한 계좌를 저장한다', () => {
  assert.ok(parseHospitalPaymentSettings({ appPaymentRequested: false, bankName: '', accountNumber: '', accountHolder: '' }));
  assert.ok(parseHospitalPaymentSettings({ ...account, appPaymentRequested: false }));
  assert.equal(parseHospitalPaymentSettings({ ...account, appPaymentRequested: false, bankName: '' }), null);
});

test('기존 병원의 미설정 상태와 미신청을 구별한다', () => {
  assert.equal(paymentSettingsFromRow(null).appPaymentRequested, null);
  assert.equal(paymentSettingsFromRow({ app_payment_requested: false }).appPaymentRequested, false);
  assert.deepEqual(paymentSettingsFromRow({ app_payment_requested: true, bank_name: '은행', account_number: '0123456', account_holder: '병원' }), {
    appPaymentRequested: true, bankName: '은행', accountNumber: '0123456', accountHolder: '병원',
  });
});
