export function animateNavigationIcon(element: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icon = element.querySelector('[data-tab-icon]') || element.firstElementChild;
  icon?.getAnimations().forEach(animation => animation.cancel());
  icon?.animate([
    { transform: 'scale(1,1)' }, { transform: 'scale(1.3,.82)', offset: .22 },
    { transform: 'scale(.88,1.1)', offset: .4 }, { transform: 'scale(1.1,.95)', offset: .56 },
    { transform: 'scale(.96,1.03)', offset: .7 }, { transform: 'scale(1.02,.99)', offset: .84 },
    { transform: 'scale(1,1)' },
  ], { duration: 640, easing: 'linear' });
}
