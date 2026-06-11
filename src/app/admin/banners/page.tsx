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
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { HomeBanner } from '@/types';
import { PageHeader, PrimaryCTA, EmptyState } from '@/components/admin/ui';
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
    <div className="space-y-6">
      <PageHeader
        title="홈 배너"
        subtitle="고객 홈 상단 슬라이드 배너를 추가, 수정, 삭제할 수 있어요."
        right={
          <PrimaryCTA onClick={() => setForm(emptyForm)}>
            새 배너
          </PrimaryCTA>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl border border-[#E5E8EB] bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#F2F4F6] px-5 py-4">
            <div>
              <h3 className="text-[15px] font-bold text-[#191F28]">등록된 배너</h3>
              <p className="text-[12px] text-[#8B95A1] mt-0.5">노출 순서가 낮을수록 먼저 보여요.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadBanners()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-[#F2F4F6] text-[12px] font-semibold text-[#4E5968] hover:bg-[#E5E8EB] transition-colors"
            >
              <RefreshCcw size={13} />
              새로고침
            </button>
          </div>

          <div className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <div className="px-5 py-12 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
            ) : sortedBanners.length === 0 ? (
              <EmptyState icon={<ImagePlus size={20} className="text-[#8B95A1]" />} title="등록된 배너가 없어요" hint='우측 상단 "새 배너"로 시작해 보세요.' />
            ) : (
              sortedBanners.map((banner) => (
                <div key={banner.id} className="grid grid-cols-[220px_minmax(0,1fr)] gap-5 px-5 py-4">
                  <div className="aspect-[2/1] overflow-hidden rounded-xl bg-gray-100">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">이미지 없음</div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                            #{banner.sortOrder}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {banner.isActive ? '노출중' : '숨김'}
                          </span>
                        </div>
                        <h4 className="mt-2 truncate text-base font-bold text-gray-900">{banner.title}</h4>
                        {banner.subtitle && <p className="mt-1 truncate text-[13px] text-[#8B95A1]">{banner.subtitle}</p>}
                        <p className="mt-2 text-xs text-gray-400">{formatPeriod(banner)}</p>
                        {banner.targetUrl && (
                          <p className="mt-1 truncate text-xs text-[#3182F6]">{banner.targetUrl}</p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleActive(banner)}
                          className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                          aria-label={banner.isActive ? '배너 숨기기' : '배너 노출하기'}
                        >
                          {banner.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(toForm(banner))}
                          className="rounded-lg bg-blue-50 p-2 text-[#3182F6] hover:bg-blue-100"
                          aria-label="배너 수정"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(banner)}
                          className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100"
                          aria-label="배너 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-[#E5E8EB] bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-[#191F28]">{form.id ? '배너 수정' : '배너 추가'}</h3>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">권장 사이즈 1774 × 887, 2:1 비율</p>
            </div>
            {form.id && (
              <button type="button" onClick={() => setForm(emptyForm)} className="text-[12px] font-semibold text-[#8B95A1] hover:text-[#4E5968]">
                새로 만들기
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">PC/공통 배너 이미지</span>
              <ImageUploader
                value={form.imageUrl}
                onChange={(url) => updateForm('imageUrl', url)}
                folder="home-banners"
                aspect="2/1"
                placeholder="배너 이미지 업로드 (2:1)"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">모바일 전용 이미지 (선택)</span>
              <ImageUploader
                value={form.mobileImageUrl}
                onChange={(url) => updateForm('mobileImageUrl', url)}
                folder="home-banners"
                aspect="2/1"
                placeholder="없으면 공통 이미지 사용"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">제목</span>
                <input
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">부제목</span>
                <input
                  value={form.subtitle}
                  onChange={(event) => updateForm('subtitle', event.target.value)}
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">클릭 이동 링크</span>
                <input
                  value={form.targetUrl}
                  onChange={(event) => updateForm('targetUrl', event.target.value)}
                  placeholder="/search 또는 https://..."
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">뱃지</span>
                <input
                  value={form.badgeText}
                  onChange={(event) => updateForm('badgeText', event.target.value)}
                  placeholder="최대 49%"
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">노출 순서</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm('sortOrder', Number(event.target.value))}
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">시작일</span>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => updateForm('startsAt', event.target.value)}
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[#4E5968]">종료일</span>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => updateForm('endsAt', event.target.value)}
                  className="w-full h-11 border border-[#E5E8EB] bg-white px-3.5 rounded-[10px] text-[14px] text-[#191F28] focus:border-[#3182F6] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
                />
              </label>
            </div>

            <label className="flex items-center justify-between rounded-[10px] bg-[#FAFBFC] border border-[#F2F4F6] px-4 py-3">
              <span className="text-[13px] font-semibold text-[#191F28]">홈에 노출</span>
              <button
                type="button"
                onClick={() => updateForm('isActive', !form.isActive)}
                className="relative inline-flex items-center w-12 h-7 rounded-full transition-colors"
                style={{ background: form.isActive ? '#3182F6' : '#E5E8EB' }}
              >
                <span
                  className="absolute w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ left: form.isActive ? '24px' : '4px' }}
                />
              </button>
            </label>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 h-12 rounded-[10px] bg-[#3182F6] text-[14px] font-semibold text-white hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중…' : form.id ? '수정 저장' : '배너 추가'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
