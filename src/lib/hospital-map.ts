type MapDestination = { name: string; address: string; lat?: number; lng?: number };

export function naverMarkerURL(lat: number, lng: number, name: string) {
  return `nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&appname=kr.co.mydoc`;
}

export async function openHospitalMap(destination: MapDestination) {
  let { lat, lng } = destination;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(destination.address)}`);
      if (response.ok) {
        const result = await response.json();
        lat = result.lat; lng = result.lng;
      }
    } catch { /* The address search remains available if geocoding fails. */ }
  }
  if (/MyDocApp|DentalApp/.test(navigator.userAgent) && typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    window.location.href = naverMarkerURL(lat, lng, destination.name);
    return;
  }
  window.location.href = `https://map.naver.com/p/search/${encodeURIComponent(destination.address || destination.name)}`;
}
