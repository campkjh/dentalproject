import assert from 'node:assert/strict';
import test from 'node:test';
import { allSlotsForDay, getAvailableTimeGroupsForDay, isDayAvailable } from '../src/components/booking/schedule';
import { hospitalVisitParts, isHospitalVisitAvailable, parseHospitalSchedule } from '../src/lib/hospital-schedule';

const rows = [
  { day: '월', start_time: '10:00:00', end_time: '19:00:00', is_closed: false },
  { day: '화', start_time: '10:30:00', end_time: '19:00:00', is_closed: false },
  { day: '일', start_time: null, end_time: null, is_closed: true },
];
const schedule = parseHospitalSchedule(rows);

test('19시 마감 병원은 10:00부터 18:30까지 18개 슬롯을 제공한다', () => {
  const slots = allSlotsForDay(2026, 11, 9, schedule.hoursByDow);
  assert.equal(slots.length, 18);
  assert.deepEqual(slots.slice(0, 3), ['10:00', '10:30', '11:00']);
  assert.equal(slots.at(-1), '18:30');
  assert.ok(!slots.includes('19:00') && !slots.includes('20:00'));
});

test('요일별 시작시간과 정기 휴무를 반영한다', () => {
  assert.equal(allSlotsForDay(2026, 11, 10, schedule.hoursByDow)[0], '10:30');
  assert.deepEqual(allSlotsForDay(2026, 11, 8, schedule.hoursByDow), []);
  assert.deepEqual(allSlotsForDay(2026, 11, 11, schedule.hoursByDow), []);
});

test('병원에서 차단한 10:30 슬롯만 사용자 화면에서 제외한다', () => {
  const blocked = parseHospitalSchedule([...rows, { day: 'slot:2026-11-09:10:30', is_closed: true }]);
  const available = getAvailableTimeGroupsForDay(2026, 11, 9, blocked.hoursByDow, blocked.disabledSlots, 0).flatMap((g) => g.slots);
  assert.ok(available.includes('10:00') && available.includes('11:00'));
  assert.ok(!available.includes('10:30'));
  assert.equal(isHospitalVisitAvailable(new Date('2026-11-09T10:30:00+09:00'), blocked), false);
});

test('하루 전체 차단과 해제된 차단 행을 구분한다', () => {
  const blocked = parseHospitalSchedule([...rows, { day: 'date:2026-11-09', is_closed: true }, { day: 'slot:2026-11-10:11:00', is_closed: false }]);
  assert.equal(isDayAvailable(2026, 11, 9, blocked.hoursByDow, blocked, 0), false);
  assert.equal(isHospitalVisitAvailable(new Date('2026-11-09T11:00:00+09:00'), blocked), false);
  assert.equal(isHospitalVisitAvailable(new Date('2026-11-10T11:00:00+09:00'), blocked), true);
});

test('서버가 운영시간 밖·30분 단위 밖·초 단위 우회 요청을 거부한다', () => {
  for (const time of ['09:30:00', '10:15:00', '19:00:00', '20:00:00', '10:30:01']) {
    assert.equal(isHospitalVisitAvailable(new Date(`2026-11-09T${time}+09:00`), schedule), false, time);
  }
  assert.equal(isHospitalVisitAvailable(new Date('2026-11-09T18:30:00+09:00'), schedule), true);
  assert.equal(isHospitalVisitAvailable(new Date('invalid'), schedule), false);
});

test('UTC로 제출해도 한국 병원 날짜와 시각으로 차단 여부를 검사한다', () => {
  const instant = new Date('2026-11-09T01:30:00Z');
  assert.deepEqual(hospitalVisitParts(instant), { date: '2026-11-09', time: '10:30', dow: 1 });
  const blocked = parseHospitalSchedule([...rows, { day: 'slot:2026-11-09:10:30', is_closed: true }]);
  assert.equal(isHospitalVisitAvailable(instant, blocked), false);
});

test('오전 시간과 밤 시간의 UTC 날짜가 달라도 한국 요일을 사용한다', () => {
  const midnight = parseHospitalSchedule([{ day: '월', start_time: '00:00', end_time: '02:00', is_closed: false }]);
  assert.equal(isHospitalVisitAvailable(new Date('2026-11-08T15:30:00Z'), midnight), true);
});

test('지난 슬롯을 제외하고 병원에서 운영시간을 변경하면 슬롯도 변경된다', () => {
  const available = getAvailableTimeGroupsForDay(2026, 11, 9, schedule.hoursByDow, {}, new Date('2026-11-09T10:00:00+09:00').getTime()).flatMap((g) => g.slots);
  assert.ok(!available.includes('10:00') && available.includes('10:30'));
  const updated = parseHospitalSchedule([{ day: '월', start_time: '11:00', end_time: '17:00', is_closed: false }]);
  assert.equal(allSlotsForDay(2026, 11, 9, updated.hoursByDow).at(-1), '16:30');
});
