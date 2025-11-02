export function safeParse(value) {
  try {
    if (!value || typeof value !== "string") return [];
    const result = JSON.parse(value);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}
