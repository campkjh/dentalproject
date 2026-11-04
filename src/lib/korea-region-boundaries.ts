// Server-side only: keep boundary geometry out of the customer JavaScript bundle.
import boundaries from './data/korea-regions-20261001.json';
import { areaLabel, areaOfAddress, type NearArea } from './home-area';

type Ring = number[][];
type RegionShape = { province: string; district: string | null; bounds: number[]; polygons: Ring[][] };

function inRing(x: number, y: number, ring: Ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    if (Math.abs((x - xi) * (yj - yi) - (y - yi) * (xj - xi)) < 1e-12
      && x >= Math.min(xi, xj) && x <= Math.max(xi, xj)
      && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return true;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Resolve the region containing the coordinate, including islands and polygon holes. */
export function regionAtCoordinates(lat: number, lng: number): NearArea | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const region of boundaries.regions as RegionShape[]) {
    const [west, south, east, north] = region.bounds;
    if (lng < west - 0.000001 || lng > east + 0.000001 || lat < south - 0.000001 || lat > north + 0.000001) continue;
    if (!region.polygons.some(([outer, ...holes]) => inRing(lng, lat, outer) && !holes.some(hole => inRing(lng, lat, hole)))) continue;
    const area = areaOfAddress(`${region.province} ${region.district ?? ''}`);
    if (area) return { ...area, label: areaLabel(area) };
  }
  return null;
}
