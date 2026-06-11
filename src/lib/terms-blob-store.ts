import { get, put } from '@vercel/blob';

const TERMS_BLOB_PATH = 'terms/index.json';

export type TermsDoc = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type TermsBlobResult = {
  terms: TermsDoc[];
  exists: boolean;
};

export const DEFAULT_TERMS: TermsDoc[] = [
  { id: 'privacy', title: '개인정보 수집 및 이용약관', content: '', updatedAt: '' },
  { id: 'service', title: '서비스 이용약관', content: '', updatedAt: '' },
  { id: 'thirdparty', title: '개인정보 제 3자 제공 동의', content: '', updatedAt: '' },
  { id: 'refund', title: '환불규정에 대한 약관', content: '', updatedAt: '' },
  { id: 'withdrawal', title: '회원탈퇴 문의', content: '', updatedAt: '' },
  { id: 'meta', title: 'META서비스 이용방침', content: '', updatedAt: '' },
];

export async function readTermsFromBlob(): Promise<TermsBlobResult> {
  try {
    const result = await get(TERMS_BLOB_PATH, { access: 'public', useCache: false });
    if (!result?.stream) return { terms: DEFAULT_TERMS, exists: false };

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed?.terms) ? parsed.terms : Array.isArray(parsed) ? parsed : null;
    if (!list) return { terms: DEFAULT_TERMS, exists: false };

    const normalized: TermsDoc[] = list
      .map((t: unknown) => {
        if (typeof t !== 'object' || t === null) return null;
        const obj = t as Record<string, unknown>;
        if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return null;
        return {
          id: obj.id,
          title: obj.title,
          content: typeof obj.content === 'string' ? obj.content : '',
          updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
        };
      })
      .filter((v: TermsDoc | null): v is TermsDoc => v !== null);

    // Merge defaults — keep any default IDs not present in blob.
    const map = new Map<string, TermsDoc>(normalized.map((t) => [t.id, t]));
    for (const def of DEFAULT_TERMS) {
      if (!map.has(def.id)) map.set(def.id, def);
    }

    return { terms: Array.from(map.values()), exists: true };
  } catch {
    return { terms: DEFAULT_TERMS, exists: false };
  }
}

export async function writeTermsToBlob(terms: TermsDoc[]) {
  return put(
    TERMS_BLOB_PATH,
    JSON.stringify({ terms, updatedAt: new Date().toISOString() }),
    {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: 'application/json; charset=utf-8',
    }
  );
}
