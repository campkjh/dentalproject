'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useStore } from '@/store';
import {
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import type { HomeBanner } from '@/types';
import { PageHeader, PrimaryCTA, EmptyState, SectionCard, StatusBadge, Switch, LoadingRows } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

type BannerForm = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  targetUrl: string;
  badgeText: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const emptyForm: BannerForm = {
  id: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  mobileImageUrl: '',
  targetUrl: '',
  badgeText: '',
  sortOrder: 0,
  isActive: true,
  startsAt: '',
  endsAt: '',
};

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toForm(banner: HomeBanner): BannerForm {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    imageUrl: banner.imageUrl,
    mobileImageUrl: banner.mobileImageUrl ?? '',
    targetUrl: banner.targetUrl ?? '',
    badgeText: banner.badgeText ?? '',
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startsAt: toDateTimeLocal(banner.startsAt),
    endsAt: toDateTimeLocal(banner.endsAt),
  };
}

function formatPeriod(banner: HomeBanner) {
  if (!banner.startsAt && !banner.endsAt) return '상시 노출';
  const start = banner.startsAt ? new Date(banner.startsAt).toLocaleDateString('ko-KR') : '즉시';
  const end = banner.endsAt ? new Date(banner.endsAt).toLocaleDateString('ko-KR') : '종료일 없음';
  return `${start} ~ ${end}`;
}

export default function AdminBannersPage() {
  const showConfirm = useStore((s) => s.showConfirm);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'mobileImageUrl' | null>(null);
  const [error, setError] = useState('');

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/banners', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '배너를 불러오지 못했습니다.');
      setBanners(Array.isArray(payload.banners) ? payload.banners : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  const updateForm = <Key extends keyof BannerForm>(key: Key, value: BannerForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    field: 'imageUrl' | 'mobileImageUrl'
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingField(field);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'home-banners');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) throw new Error(payload.error || '이미지 업로드에 실패했습니다.');
      updateForm(field, payload.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: fromDateTimeLocal(form.startsAt),
        endsAt: fromDateTimeLocal(form.endsAt),
      };
      const res = await fetch('/api/admin/banners', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.');

      const saved = data.banner as HomeBanner;
      setBanners((current) =>
        form.id ? current.map((banner) => (banner.id === saved.id ? saved : banner)) : [saved, ...current]
      );
      setForm(emptyForm);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (banner: HomeBanner) => {
    showConfirm('배너 삭제', `"${banner.title}" 배너를 삭제할까요?`, async () => {
      setError('');
      try {
        const res = await fetch('/api/admin/banners', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: banner.id }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '삭제에 실패했습니다.');
        setBanners((current) => current.filter((item) => item.id !== banner.id));
        if (form.id === banner.id) setForm(emptyForm);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const toggleActive = async (banner: HomeBanner) => {
    setError('');
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: banner.id, isActive: !banner.isActive }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '노출 상태 변경에 실패했습니다.');
      setBanners((current) =>
        current.map((item) => (item.id === banner.id ? payload.banner : item))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <PrimaryCTA onClick={() => setForm(emptyForm)}>
            <Plus size={16} /> 새 배너
          </PrimaryCTA>
        }
      />

      {error && <p className="adm-note red">{error}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] items-start">
        <SectionCard
          title="등록된 배너"
          sub="노출 순서가 낮을수록 먼저 보여요."
          action={
            <button type="button" onClick={() => void loadBanners()} className="adm-btn sm">
              <RefreshCcw size={14} /> 새로고침
            </button>
          }
        >
          {loading ? (
            <LoadingRows />
          ) : sortedBanners.length === 0 ? (
            <EmptyState icon={<ImagePlus size={22} />} title="등록된 배너가 없어요" hint='오른쪽 위 "새 배너"로 시작해 보세요.' />
          ) : (
            sortedBanners.map((banner) => (
              <div key={banner.id} className={`adm-grow grid grid-cols-[220px_minmax(0,1fr)] gap-5 ${banner.isActive ? '' : 'off'}`}>
                <div className="aspect-[2/1] overflow-hidden rounded-xl bg-[#F2F4F6]">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center adm-cell dim">이미지 없음</div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone="gray">#{banner.sortOrder}</StatusBadge>
                        <StatusBadge tone={banner.isActive ? 'green' : 'gray'}>{banner.isActive ? '노출중' : '숨김'}</StatusBadge>
                      </div>
                      <p className="adm-cell-main mt-2 truncate">{banner.title}</p>
                      {banner.subtitle && <p className="adm-cell-sub truncate">{banner.subtitle}</p>}
                      <p className="adm-cell dim mt-2">{formatPeriod(banner)}</p>
                      {banner.targetUrl && <p className="adm-cell mt-1 truncate text-[#3182F6]">{banner.targetUrl}</p>}
                    </div>
                    <div className="adm-actions flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => void toggleActive(banner)}
                        className="adm-btn sm icon"
                        aria-label={banner.isActive ? '배너 숨기기' : '배너 노출하기'}
                      >
                        {banner.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button type="button" onClick={() => setForm(toForm(banner))} className="adm-btn sm icon weak" aria-label="배너 수정">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => void handleDelete(banner)} className="adm-btn sm icon danger" aria-label="배너 삭제">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <aside className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2 className="adm-card-title">{form.id ? '배너 수정' : '배너 추가'}</h2>
              <p className="adm-card-sub">권장 사이즈 1774 × 887, 2:1 비율</p>
            </div>
            {form.id && (
              <button type="button" onClick={() => setForm(emptyForm)} className="adm-link">
                새로 만들기
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <span className="adm-label">PC/공통 배너 이미지</span>
              <ImageUploader
                value={form.imageUrl}
                onChange={(url) => updateForm('imageUrl', url)}
                folder="home-banners"
                aspect="2/1"
                placeholder="배너 이미지 업로드 (2:1)"
              />
            </div>

            <div>
              <span className="adm-label">모바일 전용 이미지 (선택)</span>
              <ImageUploader
                value={form.mobileImageUrl}
                onChange={(url) => updateForm('mobileImageUrl', url)}
                folder="home-banners"
                aspect="2/1"
                placeholder="없으면 공통 이미지 사용"
              />
            </div>

            <label className="block">
              <span className="adm-label">제목</span>
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="adm-input" />
            </label>
            <label className="block">
              <span className="adm-label">부제목</span>
              <input value={form.subtitle} onChange={(event) => updateForm('subtitle', event.target.value)} className="adm-input" />
            </label>
            <label className="block">
              <span className="adm-label">클릭 이동 링크</span>
              <input
                value={form.targetUrl}
                onChange={(event) => updateForm('targetUrl', event.target.value)}
                placeholder="/search 또는 https://..."
                className="adm-input"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="adm-label">뱃지</span>
                <input
                  value={form.badgeText}
                  onChange={(event) => updateForm('badgeText', event.target.value)}
                  placeholder="최대 49%"
                  className="adm-input"
                />
              </label>
              <label className="block">
                <span className="adm-label">노출 순서</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm('sortOrder', Number(event.target.value))}
                  className="adm-input"
                />
              </label>
            </div>

            {/* 시각까지 고르는 칸이라 AdminDatePop(날짜만) 대신 datetime-local 그대로 */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="adm-label">시작일</span>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => updateForm('startsAt', event.target.value)}
                  className="adm-input"
                />
              </label>
              <label className="block">
                <span className="adm-label">종료일</span>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => updateForm('endsAt', event.target.value)}
                  className="adm-input"
                />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F2F4F6] px-4 py-3">
              <span className="adm-cell-main">홈에 노출</span>
              <Switch checked={form.isActive} onChange={(v) => updateForm('isActive', v)} ariaLabel="홈에 노출" />
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="adm-btn primary lg w-full"
            >
              {saving ? '저장 중…' : form.id ? '수정 저장' : '배너 추가'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
