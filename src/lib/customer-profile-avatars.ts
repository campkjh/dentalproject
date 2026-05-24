export const CUSTOMER_PROFILE_AVATARS = [
  '/profile-avatars/avatar-01.png',
  '/profile-avatars/avatar-02.png',
  '/profile-avatars/avatar-03.png',
  '/profile-avatars/avatar-04.png',
  '/profile-avatars/avatar-05.png',
  '/profile-avatars/avatar-06.png',
  '/profile-avatars/avatar-07.png',
  '/profile-avatars/avatar-08.png',
  '/profile-avatars/avatar-09.png',
] as const;

export function pickRandomCustomerProfileAvatar() {
  return CUSTOMER_PROFILE_AVATARS[Math.floor(Math.random() * CUSTOMER_PROFILE_AVATARS.length)];
}

export function pickCustomerProfileAvatarBySeed(seed?: string) {
  if (!seed) return CUSTOMER_PROFILE_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return CUSTOMER_PROFILE_AVATARS[Math.abs(hash) % CUSTOMER_PROFILE_AVATARS.length];
}
