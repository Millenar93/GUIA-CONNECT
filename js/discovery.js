// Discovery rules shared by the UI and tests. Production reviews must use a separate source.
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function kilometers(origin, place) {
  if (
    !origin ||
    ![origin.lat, origin.lng, place.lat, place.lng].every(Number.isFinite)
  )
    return null;
  const rad = (x) => (x * Math.PI) / 180;
  const a =
    Math.sin(rad(place.lat - origin.lat) / 2) ** 2 +
    Math.cos(rad(origin.lat)) *
      Math.cos(rad(place.lat)) *
      Math.sin(rad(place.lng - origin.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function summary(reviews, id) {
  const list = (reviews[id] || []).filter(
    (r) =>
      r.source === "local-test" &&
      Number.isInteger(r.stars) &&
      r.stars >= 1 &&
      r.stars <= 5,
  );
  return {
    list,
    count: list.length,
    mean: list.length
      ? list.reduce((sum, r) => sum + r.stars, 0) / list.length
      : null,
  };
}
export function ranking(places, reviews, category) {
  return places
    .filter((p) => p.category === category && summary(reviews, p.id).count > 0)
    .sort((a, b) => {
      const x = summary(reviews, a.id),
        y = summary(reviews, b.id);
      return (
        y.mean - x.mean ||
        y.count - x.count ||
        a.id.localeCompare(b.id, "pt-BR", { numeric: true })
      );
    })
    .slice(0, 10)
    .map((p, index) => ({ ...p, rank: index + 1 }));
}
export function discover(places, categories, reviews, options = {}) {
  const {
    query = "",
    category = "",
    district = "",
    radius = 0,
    minRating = 0,
    onlyTop = false,
    origin = null,
    order = "name",
  } = options;
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  let list = places.filter((p) => {
    const c = categories.find((c) => c.id === p.category);
    const text = normalize(
      [
        p.name,
        c?.name,
        c?.short,
        p.district,
        p.description,
        ...(p.terms || []),
      ].join(" "),
    );
    const score = summary(reviews, p.id);
    return (
      (!category || p.category === category) &&
      (!district || p.district === district) &&
      terms.every((t) => text.includes(t)) &&
      (!radius || !origin || kilometers(origin, p) <= radius) &&
      (!minRating || (score.mean !== null && score.mean >= minRating)) &&
      (!onlyTop ||
        ranking(places, reviews, p.category).some((r) => r.id === p.id))
    );
  });
  return list.sort((a, b) =>
    order === "distance" && origin
      ? kilometers(origin, a) - kilometers(origin, b) ||
        a.id.localeCompare(b.id)
      : order === "rating"
        ? (summary(reviews, b.id).mean ?? 0) -
            (summary(reviews, a.id).mean ?? 0) ||
          summary(reviews, b.id).count - summary(reviews, a.id).count ||
          a.id.localeCompare(b.id)
        : a.name.localeCompare(b.name, "pt-BR"),
  );
}
