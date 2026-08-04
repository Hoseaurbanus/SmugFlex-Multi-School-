/**
 * Resolves duplicate class entries with the same name/level to a single canonical ID.
 * When multiple classes share the same name and level (e.g. multiple "JSS 1A" entries),
 * this picks the one with the most students.
 */
export function resolveCanonicalClassId(
  classId: string | number | null | undefined,
  classes: Array<{ id: number | string; name: string; level: string }> = [],
  students: Array<{ class_id: number | string }> = []
): string | null {
  if (!classId) return null;
  if (!classes.length) return String(classId);
  const baseClass = classes.find((c) => String(c.id) === String(classId));
  if (!baseClass) return String(classId);

  const siblings = classes.filter(
    (c) =>
      String(c.name).trim().toLowerCase() === String(baseClass.name).trim().toLowerCase() &&
      String(c.level).trim().toLowerCase() === String(baseClass.level).trim().toLowerCase()
  );

  if (siblings.length <= 1) return String(baseClass.id);

  const best = siblings
    .map((c) => ({
      id: c.id,
      count: students.filter((s) => String(s.class_id) === String(c.id)).length,
    }))
    .sort((a, b) => b.count - a.count)[0];

  return best?.id ? String(best.id) : String(baseClass.id);
}
