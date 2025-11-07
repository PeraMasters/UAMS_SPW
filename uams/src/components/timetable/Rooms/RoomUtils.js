// Tiny helpers for Rooms

export function normalizeRoom(r = {}) {
  return {
    id: r.id ?? crypto.randomUUID?.() ?? String(Date.now()),
    venue: r.venue?.trim() ?? "",
    building: r.building ?? "Computing",
    capacity: Number.isFinite(r.capacity) ? r.capacity : 60,
    status: r.status ?? "Available",
    utilization: Number.isFinite(r.utilization) ? r.utilization : 0,
  };
}
