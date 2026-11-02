/* ─────────────────────────────────────────────────────────────
 * 진동(햅틱) 한 곳(261102) — 웹은 "어떤 진동"인지만 정하고, 실제로 떨게 하는 건 네이티브 앱이다.
 *  · 네이티브에 아래 다리가 생기면 그날부터 바로 떨린다(웹은 다시 배포할 필요 없음).
 *  · 다리가 없으면(지금 앱 · 일반 브라우저) 안드로이드 크롬만 navigator.vibrate 로 흉내 낸다. 아이폰 사파리는 웹 진동이 없다.
 *  · 화면 코드는 haptic('selection') 처럼 부르기만 한다 — navigator.vibrate 를 직접 부르지 말 것.
 *
 * 진동 종류(type) — 아이폰 진동 API 이름 그대로
 *  selection            다이얼 한 칸·탭·칩·고르기가 바뀔 때 (UISelectionFeedbackGenerator)
 *  light·medium·heavy   누름 세기 순 — 기본 버튼은 light (UIImpactFeedbackGenerator .light/.medium/.heavy)
 *  soft·rigid           말랑한 툭 / 딱딱한 딱 (UIImpactFeedbackGenerator .soft/.rigid)
 *  success·warning·error  결과 알림 — 됐어요·확인 필요·실패 (UINotificationFeedbackGenerator)
 *  intensity            0~1, 누름(light~rigid)에만 쓴다 — 당겨서 새로고침의 '두두드드득'처럼 점점 세게
 *
 * 네이티브가 만들 다리(만들기 전엔 아무 일도 안 한다)
 *  iOS     WKScriptMessageHandler 이름 "haptic" — body = { type: String, intensity: Double? }
 *            userContentController.add(self, name: "haptic")
 *            selection → UISelectionFeedbackGenerator().selectionChanged()
 *            light/medium/heavy/soft/rigid → UIImpactFeedbackGenerator(style:).impactOccurred(intensity: intensity ?? 1)
 *            success/warning/error → UINotificationFeedbackGenerator().notificationOccurred(.success/.warning/.error)
 *  Android addJavascriptInterface(객체, "AndroidHaptic") — @JavascriptInterface fun perform(json: String)
 *            json = {"type":"selection","intensity":0.6} (intensity 는 없을 수 있다)
 *            selection → CLOCK_TICK · light → KEYBOARD_TAP · medium → CONTEXT_CLICK · heavy → LONG_PRESS
 *            soft → TEXT_HANDLE_MOVE · rigid → VIRTUAL_KEY · success → CONFIRM · warning/error → REJECT (view.performHapticFeedback)
 *            세기를 살리려면 API 30+ VibrationEffect.startComposition().addPrimitive(PRIMITIVE_TICK/CLICK, intensity)
 *  둘 다 메인 스레드에서 떨게 할 것 — 다이얼을 빨리 굴리면 1초에 수십 번 온다.
 * ──────────────────────────────────────────────────────────── */

export type HapticType =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'success'
  | 'warning'
  | 'error';

type HapticWindow = Window & {
  webkit?: { messageHandlers?: { haptic?: { postMessage: (msg: unknown) => void } } };
  AndroidHaptic?: { perform: (json: string) => void };
};

// 다리가 없을 때 안드로이드 크롬 흉내(ms) — 패턴은 [떨림, 쉼, 떨림…]
const FALLBACK: Record<HapticType, number | number[]> = {
  selection: 4,
  light: 8,
  medium: 14,
  heavy: 22,
  soft: 6,
  rigid: 10,
  success: [12, 60, 18],
  warning: [18, 80, 18],
  error: [24, 60, 24, 60, 24],
};

// 같은 순간 겹쳐 부르면 한 번만(탭 + 토스트가 같이 오는 등) — 다이얼 틱은 이보다 느리게 온다
const MIN_GAP_MS = 18;
let lastAt = 0;
let lastType: HapticType | null = null;

export function haptic(type: HapticType = 'light', opts?: { intensity?: number }) {
  if (typeof window === 'undefined') return;
  const now = performance.now();
  if (now - lastAt < MIN_GAP_MS && lastType === type) return;
  lastAt = now;
  lastType = type;
  const intensity = opts?.intensity == null ? undefined : Math.max(0, Math.min(1, opts.intensity));
  const w = window as HapticWindow;
  try {
    const ios = w.webkit?.messageHandlers?.haptic;
    if (ios) {
      ios.postMessage(intensity == null ? { type } : { type, intensity });
      return;
    }
    if (w.AndroidHaptic?.perform) {
      w.AndroidHaptic.perform(JSON.stringify(intensity == null ? { type } : { type, intensity }));
      return;
    }
    // 크롬은 화면을 한 번도 안 누른 페이지의 진동을 막고 콘솔에 오류를 남긴다 — 그 전엔 부르지 않는다
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    const ms = FALLBACK[type];
    navigator.vibrate?.(typeof ms === 'number' && intensity != null ? Math.max(2, Math.round(ms * (0.5 + intensity / 2))) : ms);
  } catch {
    // 진동은 곁들이 — 실패해도 화면 동작은 그대로
  }
}

/** 안내 문구로 결과 진동 고르기 — 토스트 아이콘(Toast.tsx)과 같은 규칙 */
export function toneOfMessage(msg: string): 'error' | 'warning' | 'success' | 'info' {
  if (/실패|거부|오류|에러|못했|못 했|없어요|안 돼|안돼|만료|제한/.test(msg)) return 'error';
  if (/해 주세요|해주세요|확인해|입력해|골라|선택해|필요/.test(msg)) return 'warning';
  if (/했어요|됐어요|되었|완료|복사|담았|저장|보냈|등록/.test(msg)) return 'success';
  return 'info';
}
