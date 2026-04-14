interface AvatarProps {
  src?: string;
  gender?: string;
  seed?: string;
  role?: 'user' | 'doctor';
  size?: number;
  alt?: string;
  className?: string;
}

const MALE = '/icons/profile-default-male.svg';
const FEMALE = '/icons/profile-default-female.svg';
const DOCTOR = '/icons/profile-default-doctor.svg';

function pickByGender(gender?: string) {
  const g = (gender || '').trim().toLowerCase();
  if (g === '여성' || g === 'female' || g === 'f' || g === 'woman') return FEMALE;
  if (g === '남성' || g === 'male' || g === 'm' || g === 'man') return MALE;
  return null;
}

function pickBySeed(seed?: string) {
  if (!seed) return MALE;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 2 === 0 ? MALE : FEMALE;
}

export default function Avatar({
  src,
  gender,
  seed,
  role,
  size = 40,
  alt = '',
  className = '',
}: AvatarProps) {
  let resolved = src && src.trim() !== '' ? src : undefined;
  if (!resolved) {
    if (role === 'doctor') resolved = DOCTOR;
    else resolved = pickByGender(gender) ?? pickBySeed(seed);
  }
  return (
    <img
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
