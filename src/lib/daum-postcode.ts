/* ─────────────────────────────────────────────────────────────
 * 다음(카카오) 우편번호 서비스 — 스크립트 한 번만 불러오기 + 타입.
 *  · 화면에서는 .open()(새 창) 금지 — 앱 웹뷰에서 새 창이 흰 화면으로 뜬다(261102).
 *    늘 AddressSearchSheet(components/common) 안에 .embed() 로 끼워 쓴다.
 *  · 옵션·theme 키 = https://postcode.map.daum.net/guide
 * ──────────────────────────────────────────────────────────── */

export type DaumPostcodeData = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  apartment: 'Y' | 'N';
  userSelectedType: 'R' | 'J';
  bname: string;
};

export type DaumPostcodeTheme = Partial<
  Record<
    | 'bgColor'
    | 'searchBgColor'
    | 'contentBgColor'
    | 'pageBgColor'
    | 'textColor'
    | 'queryTextColor'
    | 'postcodeTextColor'
    | 'emphTextColor'
    | 'outlineColor',
    string
  >
>;

type DaumPostcodeOptions = {
  oncomplete: (data: DaumPostcodeData) => void;
  width?: string | number;
  height?: string | number;
  theme?: DaumPostcodeTheme;
  animation?: boolean;
  focusInput?: boolean;
  hideMapBtn?: boolean;
  hideEngBtn?: boolean;
  useBannerLink?: boolean;
  maxSuggestItems?: number;
  pleaseReadGuide?: number;
};

type DaumPostcodeInstance = {
  embed: (element: HTMLElement, options?: { q?: string; autoClose?: boolean }) => void;
};

declare global {
  interface Window {
    daum?: { Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance };
  }
}

const SCRIPT_ID = 'daum-postcode-script';
let loader: Promise<void> | null = null;

export function loadDaumPostcode(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('주소 검색을 사용할 수 없어요.'));
  if (window.daum?.Postcode) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    document.getElementById(SCRIPT_ID)?.remove();
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => (window.daum?.Postcode ? resolve() : reject(new Error('주소 검색을 불러오지 못했어요.')));
    script.onerror = () => reject(new Error('주소 검색을 불러오지 못했어요.'));
    document.head.appendChild(script);
  }).catch((e) => {
    // 실패하면 다음에 다시 불러올 수 있게
    loader = null;
    throw e;
  });
  return loader;
}
