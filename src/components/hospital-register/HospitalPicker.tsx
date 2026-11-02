'use client';

// 원장 등록 — 소속 병원 찾기. 승인된 병원 목록(/api/hospitals)을 한 번 받아 화면에서 거른다.
//  · 검색어 없으면 고른 과의 병원(없으면 전체) · 있으면 이름·주소에 낱말이 다 들어간 병원(같은 과 먼저)
//  · 찾는 병원이 없으면 '병원 새로 등록하기'로 병원 등록 흐름으로 건너간다(검색어는 병원명에 미리 채워짐).
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { RgCheck, RgEmpty, RgRow, RgRows, RgSearch, rgStyles as s } from './RegisterKit';

export type PickedHospital = { id: string; name: string; category: string; address: string; image: string };

const MAX_ROWS = 50;
// 옛 경로(/images/hospital*.jpg 등)처럼 안 뜨는 사진은 기본 병원 그림으로
const FALLBACK_IMAGE = '/partner-template/nav-hospital.svg';
export const hospitalImageFallback = (e: SyntheticEvent<HTMLImageElement>) => {
  if (!e.currentTarget.src.endsWith(FALLBACK_IMAGE)) e.currentTarget.src = FALLBACK_IMAGE;
};

let listPromise: Promise<PickedHospital[]> | null = null;
function loadHospitals() {
  if (!listPromise) {
    listPromise = fetch('/api/hospitals')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => (Array.isArray(j.hospitals) ? (j.hospitals as PickedHospital[]) : []))
      .catch((e) => {
        listPromise = null;
        throw e;
      });
  }
  return listPromise;
}

const squash = (v: string) => v.toLowerCase().replace(/\s+/g, '');

export default function HospitalPicker({
  category,
  categoryName,
  query,
  onQuery,
  picked,
  onPick,
  onRegisterNew,
}: {
  category: string | null;
  categoryName: string;
  query: string;
  onQuery: (next: string) => void;
  picked: PickedHospital | null;
  onPick: (h: PickedHospital) => void;
  onRegisterNew: () => void;
}) {
  const [all, setAll] = useState<PickedHospital[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    loadHospitals()
      .then((list) => { if (alive) setAll(list); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [attempt]);

  const view = useMemo(() => {
    if (!all) return null;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      const same = all.filter((h) => h.category === category);
      const base = same.length ? same : all;
      return { rows: base, head: same.length ? `${categoryName} 병원` : '전체 병원' };
    }
    const whole = squash(query);
    const hits = all.filter((h) => {
      const hay = `${h.name} ${h.address}`.toLowerCase();
      return tokens.every((t) => hay.includes(t)) || squash(h.name).includes(whole);
    });
    const rank = (h: PickedHospital) => (h.category === category ? 0 : 2) + (squash(h.name).startsWith(squash(tokens[0])) ? 0 : 1);
    hits.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'ko'));
    return { rows: hits, head: `검색 결과 ${hits.length}곳` };
  }, [all, query, category, categoryName]);

  // 고른 병원이 지금 목록 밖이면 맨 위에 붙여 둔다(검색어를 바꿔도 무엇을 골랐는지 보이게)
  const rows = view ? view.rows.slice(0, MAX_ROWS) : [];
  if (picked && view && !rows.some((h) => h.id === picked.id)) rows.unshift(picked);

  return (
    <div>
      <RgSearch value={query} onChange={onQuery} placeholder="병원 이름이나 주소로 찾기" />

      {failed ? (
        <RgEmpty
          title="병원 목록을 불러오지 못했어요"
          desc="인터넷 연결을 확인하고 다시 시도해 주세요."
          action={{ label: '다시 시도', onClick: () => { setFailed(false); setAttempt((n) => n + 1); } }}
        />
      ) : !view ? (
        <div aria-hidden="true">
          {[72, 56, 64, 48, 60].map((w, i) => (
            <div key={i} className={s.skRow}>
              <span className={s.skThumb} />
              <span className="flex flex-1 flex-col gap-2">
                <span className={s.skLine} style={{ width: `${w}%` }} />
                <span className={s.skLine} style={{ width: `${w - 20}%`, height: 11 }} />
              </span>
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <>
          <p className={s.rowsHead}>{view.head}</p>
          <RgRows role="radiogroup" label="병원 목록">
            {rows.map((h) => {
              const on = picked?.id === h.id;
              return (
                <RgRow
                  key={h.id}
                  on={on}
                  onClick={() => onPick(h)}
                  // eslint-disable-next-line @next/next/no-img-element
                  lead={<img src={h.image} alt="" loading="lazy" onError={hospitalImageFallback} className={s.rowThumb} />}
                  label={h.name}
                  sub={h.address || '주소 미등록'}
                  trail={<RgCheck on={on} />}
                />
              );
            })}
          </RgRows>
          {view.rows.length > MAX_ROWS && <p className={s.rowsMore}>이름이나 주소를 더 넣으면 빨리 찾을 수 있어요</p>}
          <div className={s.rowsFoot}>
            찾는 병원이 없나요?
            <button type="button" onClick={onRegisterNew}>병원 새로 등록하기</button>
          </div>
        </>
      ) : (
        <RgEmpty
          title={query.trim() ? `‘${query.trim()}’ 병원을 찾지 못했어요` : '아직 등록된 병원이 없어요'}
          desc="마이닥에 없는 병원이라면 새로 등록할 수 있어요."
          action={{ label: '병원 새로 등록하기', onClick: onRegisterNew }}
        />
      )}
    </div>
  );
}
