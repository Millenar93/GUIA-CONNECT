import test from "node:test";
import assert from "node:assert/strict";
import { discover, ranking, summary, kilometers } from "../js/discovery.js";
import { places, categories } from "../js/data.js";
const review = (stars, source = "local-test") => ({ stars, source });
test("busca livre aceita singular, termos e acentos", () => {
  assert.equal(
    discover(places, categories, {}, { query: "restaurante" }).length,
    2,
  );
  assert.equal(
    discover(places, categories, {}, { query: "cafe sol" }).at(0).id,
    "2",
  );
  assert.equal(
    discover(places, categories, {}, { query: "bicicleta" }).at(0).id,
    "7",
  );
});
test("raio filtra por coordenadas e ordena por proximidade", () => {
  const origin = { lat: -23.622, lng: -45.412 };
  const list = discover(
    places,
    categories,
    {},
    { origin, radius: 1, order: "distance" },
  );
  assert.equal(list.at(0).id, "1");
  assert.ok(list.every((p) => kilometers(origin, p) <= 1));
  assert.equal(kilometers(null, places[0]), null);
  assert.equal(
    discover(places, categories, {}, { radius: 1 }).length,
    places.length,
  );
});
test("avaliações de produção e notas inválidas não se misturam com testes", () => {
  assert.equal(
    summary(
      { 1: [review(5, "production"), review(0), review(6), review(4)] },
      "1",
    ).mean,
    4,
  );
  assert.equal(summary({}, "1").mean, null);
  assert.equal(ranking(places, {}, "restaurantes").length, 0);
});
test("ranking desempata por quantidade e ID estável", () => {
  const list = Array.from({ length: 12 }, (_, i) => ({
    ...places[0],
    id: String(i + 1),
    lat: -23.622 + i * 0.001,
  }));
  const reviews = Object.fromEntries(list.map((p) => [p.id, [review(4)]]));
  reviews["3"].push(review(4));
  const ranked = ranking(list, reviews, "restaurantes");
  assert.equal(ranked.length, 10);
  assert.deepEqual(
    ranked.slice(0, 3).map((p) => p.id),
    ["3", "1", "2"],
  );
  const distanceOrder = [...ranked].sort(
    (a, b) =>
      kilometers({ lat: -23.622, lng: -45.412 }, a) -
      kilometers({ lat: -23.622, lng: -45.412 }, b),
  );
  assert.equal(distanceOrder[0].id, "1");
  assert.equal(distanceOrder[0].rank, 2);
  assert.equal(ranked[0].rank, 1);
});
test("filtros de nota e Top 10 excluem lugares ainda sem avaliações", () => {
  const reviews = { 2: [review(5)] };
  assert.deepEqual(
    discover(places, categories, reviews, { minRating: 4 }).map((p) => p.id),
    ["2"],
  );
  assert.deepEqual(
    discover(places, categories, reviews, { onlyTop: true }).map((p) => p.id),
    ["2"],
  );
  assert.equal(
    discover(places, categories, reviews, {
      district: "Massaguaçu",
      minRating: 4,
    }).length,
    0,
  );
});
