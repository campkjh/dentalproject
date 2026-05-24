import { pickCustomerProfileAvatarBySeed } from '@/lib/customer-profile-avatars';

interface AvatarProps {
  src?: string;
  gender?: string;
  seed?: string;
  role?: 'user' | 'doctor';
  size?: number;
  alt?: string;
  className?: string;
}

const DOCTOR = '/icons/profile-default-doctor.svg';

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
    else resolved = pickCustomerProfileAvatarBySeed(seed || gender || alt);
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
