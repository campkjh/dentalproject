export function bookingPricing(price: number, balance: number, couponAmount = 0, requestedPoints = 0) {
  const base = Math.max(0, Math.floor(price));
  const coupon = Math.min(base, Math.max(0, Math.floor(couponAmount)));
  const maxPoints = Math.min(Math.max(0, Math.floor(balance)), base - coupon);
  const points = Math.min(maxPoints, Math.max(0, Math.floor(requestedPoints)));
  return { coupon, maxPoints, points, amount: base - coupon - points };
}
