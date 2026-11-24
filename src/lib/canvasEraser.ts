export type Point = { x: number; y: number };

function distSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Squared distance from point p to segment ab. */
function pointToSegmentDistSq(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return distSq(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distSq(p, { x: a.x + t * abx, y: a.y + t * aby });
}

/** True if point p is within radius of any segment in the polyline. */
export function pointNearPolyline(p: Point, polyline: Point[], radius: number): boolean {
  if (polyline.length === 0) return false;
  const r2 = radius * radius;
  if (polyline.length === 1) return distSq(p, polyline[0]) <= r2;
  for (let i = 0; i < polyline.length - 1; i++) {
    if (pointToSegmentDistSq(p, polyline[i], polyline[i + 1]) <= r2) return true;
  }
  return false;
}

/**
 * Split a stroke polyline into remaining runs after erasing with an eraser trail.
 * A path point is erased when it lies within (eraserRadius + strokeHalfWidth) of the eraser polyline.
 * Runs with fewer than 2 points are dropped.
 */
export function erasePolyline(
  points: Point[],
  eraserPath: Point[],
  strokeLineWidth: number,
  eraserRadius: number,
): Point[][] {
  if (points.length < 2 || eraserPath.length === 0) return points.length >= 2 ? [points] : [];

  const hitRadius = eraserRadius + strokeLineWidth / 2;
  const keep: boolean[] = points.map((p) => !pointNearPolyline(p, eraserPath, hitRadius));

  const runs: Point[][] = [];
  let current: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) {
      current.push(points[i]);
    } else if (current.length > 0) {
      if (current.length >= 2) runs.push(current);
      current = [];
    }
  }
  if (current.length >= 2) runs.push(current);
  return runs;
}
