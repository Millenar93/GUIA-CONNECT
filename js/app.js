import { icon } from "./icons.js";
import { categories, places } from "./data.js";
import { kilometers, summary, ranking, discover } from "./discovery.js";
const $ = (s) => document.querySelector(s),
  app = $("#app"),
  dialog = $("#dialog");
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem("gc-" + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem("gc-" + key, JSON.stringify(value));
    return true;
  } catch {
    toast("Armazenamento indisponível. As mudanças valem apenas nesta sessão.");
    return false;
  }
}
let favorites = read("favorites", []),
  edits = read("edits", {}),
  preferences = read("preferences", []),
  session = null,
  role = "cliente",
  query = "",
  filter = "",
  district = "",
  order = "name",
  view = "map",
  location = null,
  map = null,
  tileFailures = 0;
let reviews = read("reviews", {}),
  radius = 0,
  minRating = 0,
  onlyTop = false,
  geoAttempted = false,
  geoStatus = "Caraguatatuba como referência",
  geoRequest = 0,
  geoPending = false,
  selectedPlace = null,
  expanded = false,
  manualSelection = false,
  markerLayer = null,
  positionLayer = null;
let topDistrict = "",
  topMin = 0,
  topOrder = "rating";
let returnFocus = null;
let mapViewport = null;
const all = () =>
  places.map((p) => {
    const edited = { ...p, ...edits[p.id] };
    if (edited.category !== p.category)
      edited.terms =
        places.find((x) => x.category === edited.category)?.terms || [];
    return edited;
  });
const cat = (id) => categories.find((c) => c.id === id) || categories[0];
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("#toast").style.display = "none"),
    5000,
  );
}
function distance(p) {
  return kilometers(location, p);
}
function distanceLabel(p) {
  return location
    ? `${distance(p).toFixed(1)} km em linha reta${location.source === "manual" ? " do ponto escolhido" : ""} · coordenadas do lugar ilustrativas`
    : "Distância indisponível — escolha uma localização";
}
function ratingLabel(p) {
  const r = summary(reviews, p.id);
  return r.count
    ? `★ ${r.mean.toFixed(1)} · ${r.count} avaliação${r.count > 1 ? "s" : ""} de teste local`
    : "Ainda sem avaliações";
}
function results() {
  return discover(all(), categories, reviews, {
    query,
    category: filter,
    district,
    radius,
    minRating,
    onlyTop,
    origin: location,
    order,
  });
}
function favorite(id) {
  favorites = favorites.includes(id)
    ? favorites.filter((x) => x !== id)
    : [...favorites, id];
  save("favorites", favorites);
  document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => {
    b.classList.toggle("saved", favorites.includes(id));
    b.innerHTML = icon("heart");
    b.setAttribute("aria-pressed", favorites.includes(id));
  });
  if (route() === "favoritos") render();
}
function card(p) {
  return `<article class="card"><img src="${escape(p.image)}" alt="Imagem ilustrativa de ${escape(p.name)}" loading="lazy"><button class="favorite ${favorites.includes(p.id) ? "saved" : ""}" data-fav="${p.id}" aria-label="Favoritar ${escape(p.name)}" aria-pressed="${favorites.includes(p.id)}">${icon("heart")}</button><div class="card-content"><span class="tag">${cat(p.category).short} · exemplo fictício</span><h3>${escape(p.name)}</h3><p>⌖ ${escape(p.district)} · Caraguatatuba</p><p class="rating-label">${ratingLabel(p)}</p><div class="card-bottom"><small>${distanceLabel(p)}</small><button data-place="${p.id}">Conhecer ↗</button></div></div></article>`;
}
function route() {
  return window.location.hash.slice(1) || "welcome";
}
function go(path) {
  if (route() === path) render();
  else window.location.hash = path;
}
function nav(current) {
  const tabs = [
    ["categorias", icon("menu"), "Categorias"],
    ["favoritos", icon("heart"), "Favoritos"],
    ["mapa", icon("map"), "Mapa"],
    ["top", icon("star"), "Top 10"],
    ["perfil", icon("person"), "Perfil"],
  ];
  $("#nav").classList.toggle(
    "hidden",
    ["welcome", "empresa"].includes(current),
  );
  $("#nav").innerHTML = tabs
    .map(
      ([id, icon, title]) =>
        `<button data-go="${id}" class="${id === "mapa" ? "center " : ""}${current === id ? "active" : ""}" ${current === id ? 'aria-current="page"' : ""}><span class="nav-icon">${icon}</span>${title}</button>`,
    )
    .join("");
}
function search() {
  return `<div class="search-container"><div class="search">${icon("search")}<input id="search" autocomplete="off" aria-label="Busque lugares, restaurantes, passeios e serviços" aria-controls="suggestions" aria-expanded="false" placeholder="${route() === "mapa" ? "O que tem perto?" : "Buscar nesta categoria"}" value="${escape(query)}"><button id="clear-search" aria-label="Limpar pesquisa">${icon("close")}</button><button id="open-filters" aria-label="Abrir filtros">${icon("filters")}</button></div><div id="suggestions" class="suggestions hidden" aria-label="Sugestões de lugares"></div></div>`;
}
function chips() {
  return `<div class="filters"><button class="pill ${!filter ? "active" : ""}" data-filter="">✦ Tudo para explorar</button>${categories.map((c) => `<button class="pill ${filter === c.id ? "active" : ""}" data-filter="${c.id}">${c.icon} ${c.short}</button>`).join("")}</div>`;
}
function filterControls() {
  return `<div class="toolbar"><select id="district" aria-label="Filtrar por bairro"><option value="">Todos os bairros</option>${[...new Set(all().map((p) => p.district))].map((d) => `<option ${district === d ? "selected" : ""}>${escape(d)}</option>`).join("")}</select><select id="order" aria-label="Ordenação"><option value="name" ${order === "name" ? "selected" : ""}>Nome</option><option value="distance" ${!location ? "disabled" : ""} ${order === "distance" ? "selected" : ""}>Proximidade ${!location ? "(sem localização)" : ""}</option><option value="rating" ${order === "rating" ? "selected" : ""}>Avaliação no Guia Connect</option></select></div>`;
}
function filterSummary() {
  return `${filter ? cat(filter).short : "Todas as categorias"}${radius && location ? ` · até ${radius} km` : ""}${minRating ? ` · nota mínima ${minRating}` : ""}${onlyTop ? " · integrantes do Top 10" : ""}`;
}
function filtersModal() {
  modal(
    `<h2>Encontre do seu jeito</h2><p>As avaliações são apenas testes deste navegador.</p><form id="filters-form"><label>Categoria<select name="category"><option value="">Todas as categorias</option>${categories.map((c) => `<option value="${c.id}" ${filter === c.id ? "selected" : ""}>${c.short}</option>`).join("")}</select></label><label>Raio em linha reta<select name="radius" ${!location ? "disabled" : ""}>${[0, 1, 5, 10, 25, 50].map((n) => `<option value="${n}" ${radius === n ? "selected" : ""}>${n ? n + " km" : "Sem limite"}</option>`).join("")}</select></label>${!location ? "<p>Raio indisponível: obtenha sua localização ou escolha um ponto manual.</p>" : ""}<label>Ordenar resultados<select name="order"><option value="name" ${order === "name" ? "selected" : ""}>Nome</option><option value="distance" ${!location ? "disabled" : ""} ${order === "distance" ? "selected" : ""}>Proximidade</option><option value="rating" ${order === "rating" ? "selected" : ""}>Avaliação Guia Connect</option></select></label><label>Nota mínima no Guia Connect<select name="rating">${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${minRating === n ? "selected" : ""}>${n ? n + " estrelas" : "Todas, incluindo sem avaliações"}</option>`).join("")}</select></label><label><input style="display:inline;width:auto" type="checkbox" name="top" ${onlyTop ? "checked" : ""}> Somente integrantes do Top 10 da categoria</label><p>Top 10 considera somente registros com avaliações de teste local. Sem avaliações, não há classificação.</p><button class="primary" type="submit">Aplicar filtros</button></form>`,
  );
  $("#filters-form").onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    filter = d.get("category");
    order = d.get("order");
    if ($("#order")) $("#order").value = order;
    radius = Number(d.get("radius") || 0);
    minRating = Number(d.get("rating"));
    onlyTop = d.has("top");
    dialog.close();
    if (route().startsWith("categoria/") && filter !== route().split("/")[1])
      go("mapa");
    else {
      drawResults();
      $("#filter-summary").textContent = filterSummary();
    }
  };
}
function empty() {
  return `<div class="empty"><h3>Nenhum registro corresponde à busca.</h3><p>Os exemplos disponíveis são de Caraguatatuba. Amplie o raio, mude os filtros ou explore o município. Lugares sem avaliação não entram em filtros por nota ou Top 10.</p><button id="reset">Limpar pesquisa e filtros</button><button id="explore-city">Explorar Caraguatatuba</button></div>`;
}
function welcome() {
  app.innerHTML = `<section class="welcome"><div class="welcome-photo"><span class="eyebrow" style="color:#c9eee6">LITORAL NORTE · SÃO PAULO</span><h1>A cidade tem<br>muito pra contar.</h1><p>Descubra seu próximo lugar favorito.<br>Caraguatatuba é só o começo.</p></div><div class="welcome-content"><span class="eyebrow">BEM-VINDO AO GUIA CONNECT</span><h1>Conecte-se com<br>o melhor do seu dia.</h1><p>Lugares, experiências e serviços.<br>Um novo jeito de viver a cidade.</p><div class="role"><button data-role="cliente" class="${role === "cliente" ? "primary" : ""}">Sou cliente</button><button data-role="empresa" class="${role === "empresa" ? "primary" : ""}">Sou empresa</button></div><button class="primary" data-auth="entrar">Entrar →</button><button class="outline" data-auth="cadastro">Criar conta</button><button class="text-button" id="guest">Explorar sem cadastro →</button><p class="footer-note">Acesso demonstrativo. Nenhuma autenticação real ou senha armazenada.</p></div></section>`;
}
function mapPage() {
  app.innerHTML = `<section class="map-stage" aria-label="Explore os registros no mapa"><section class="workspace ${view === "map" ? "map-mode" : "list-mode"}"><aside><div class="result-head"><b id="count"></b><button id="list-filters">${icon("filters")} Filtros</button></div><p id="filter-summary" class="filter-summary">${filterSummary()}</p>${filterControls()}<div id="results" class="results"></div></aside><div class="map-wrap"><div id="map"></div><div class="map-note" id="map-note">Lugares fictícios · posições ilustrativas</div></div></section><div class="map-top">${search()}<div class="location-bar"><span id="location-status" role="status">${escape(geoStatus)}</span><div class="location-options"><button id="manual-location">Escolher ponto</button><button id="explore-city">Explorar Caraguá</button></div></div></div><div class="map-tools"><button id="view">${icon(view === "map" ? "menu" : "map")} ${view === "map" ? "Ver lista" : "Ver mapa"}</button><button id="locate" aria-label="${location?.source === "device" ? "Recentralizar na minha localização" : "Minha localização"}">${icon("locate")} <span>${location?.source === "device" ? "Recentralizar" : "Minha localização"}</span></button></div><section id="place-sheet" class="place-sheet hidden" aria-label="Detalhes do lugar"></section></section>`;
  $("#overlay-root").append($("#place-sheet"));
  drawResults();
  initMap();
  if (!geoAttempted && !location) {
    geoAttempted = true;
    locate();
  }
  if (selectedPlace) showSheet(selectedPlace);
}
function drawResults() {
  const list = results();
  if ($("#results"))
    $("#results").innerHTML = list.length ? list.map(card).join("") : empty();
  if ($("#count"))
    $("#count").textContent = `${list.length} registros encontrados`;
  if ($("#filter-summary")) $("#filter-summary").textContent = filterSummary();
  if (map && markerLayer) {
    markerLayer.clearLayers();
    list.forEach((p) => {
      const c = cat(p.category),
        marker = L.marker([p.lat, p.lng], {
          title: p.name,
          alt: p.name,
          icon: L.divIcon({
            className: "",
            html: `<div class="pin" style="background:${c.color};width:38px;height:38px"><span>${c.icon}</span></div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
          }),
        }).addTo(markerLayer);
      marker.on("click", () => {
        returnFocus = marker.getElement();
        showSheet(p.id);
        $("#expand-sheet")?.focus();
      });
      marker.getElement().addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          marker.fire("click");
        }
      });
      marker.bindTooltip(escape(p.name));
    });
    drawPosition();
  }
}
function drawPosition() {
  if (!map || !positionLayer) return;
  positionLayer.clearLayers();
  if (!location) return;
  const device = location.source === "device";
  L.marker([location.lat, location.lng], {
    title: device ? "Você está aqui" : "Ponto escolhido manualmente",
    alt: device ? "Você está aqui" : "Ponto escolhido manualmente",
    icon: L.divIcon({
      className: "",
      html: `<div class="user-position ${device ? "" : "manual"}"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  })
    .addTo(positionLayer)
    .bindTooltip(device ? "Você está aqui" : "Ponto escolhido manualmente", {
      permanent: true,
      direction: "right",
    });
  if (device && Number.isFinite(location.accuracy))
    L.circle([location.lat, location.lng], {
      radius: location.accuracy,
      color: "#2677e8",
      fillOpacity: 0.1,
      weight: 1,
    }).addTo(positionLayer);
}
function initMap() {
  if (!window.L) {
    $("#map").innerHTML =
      '<div class="empty"><h2>Seu guia continua aqui.</h2><p>Não foi possível carregar o mapa. Explore os registros na lista.</p><button id="fallback-list">Ver lista de lugares</button></div>';
    return;
  }
  map = L.map("map", { scrollWheelZoom: true, zoomAnimation: false }).setView(
    mapViewport?.center ||
      (location ? [location.lat, location.lng] : [-23.612, -45.398]),
    mapViewport?.zoom ?? (location ? 14 : 12),
  );
  markerLayer = L.layerGroup().addTo(map);
  positionLayer = L.layerGroup().addTo(map);
  tileFailures = 0;
  const tile = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    },
  );
  tile.on("tileerror", () => {
    tileFailures++;
    if ($("#map-note"))
      $("#map-note").textContent =
        "Fundo do mapa indisponível ou incompleto. Marcadores e lista continuam disponíveis.";
  });
  tile.addTo(map);
  map.on("click", (e) => {
    if (manualSelection) {
      manualSelection = false;
      setOrigin({ lat: e.latlng.lat, lng: e.latlng.lng, source: "manual" });
      toast("Ponto manual selecionado; não é sua localização real.");
    }
  });
  drawResults();
}
function updateGeoStatus(message) {
  geoStatus = message;
  if ($("#location-status")) $("#location-status").textContent = message;
}
function setOrigin(origin) {
  const hadOrigin = !!location;
  location = origin;
  mapViewport = { center: [origin.lat, origin.lng], zoom: 14 };
  geoAttempted = true;
  geoPending = false;
  order = "distance";
  if (!hadOrigin && !radius) radius = 25;
  updateGeoStatus(
    origin.source === "device"
      ? "Você está aqui · localização fornecida pelo dispositivo"
      : "Ponto escolhido manualmente · não é sua localização real",
  );
  if (map) map.setView([origin.lat, origin.lng], 14);
  if ($("#order")) {
    const option = $('#order option[value="distance"]');
    option.disabled = false;
    option.textContent = "Proximidade";
    $("#order").value = order;
  }
  if ($("#locate"))
    $("#locate").innerHTML =
      icon("locate") +
      (origin.source === "device" ? " Recentralizar" : " Minha localização");
  drawResults();
  if (selectedPlace && $("#place-sheet")) showSheet(selectedPlace);
}
function manualLocation() {
  modal(
    `<h2>Escolha um ponto de referência</h2><p>Esse ponto será identificado como manual. Não representa sua localização real.</p><form id="manual-form"><label>Latitude<input name="lat" type="number" step="any" min="-90" max="90" required value="${location?.lat ?? -23.622}"></label><label>Longitude<input name="lng" type="number" step="any" min="-180" max="180" required value="${location?.lng ?? -45.412}"></label><button class="primary" type="submit">Usar este ponto</button>${map ? '<button type="button" id="pick-map">Selecionar no mapa</button>' : ""}</form>`,
  );
  $("#manual-form").onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    geoRequest++;
    setOrigin({
      lat: Number(d.get("lat")),
      lng: Number(d.get("lng")),
      source: "manual",
    });
    dialog.close();
  };
}
function exploreCity() {
  mapViewport = { center: [-23.612, -45.398], zoom: 12 };
  geoRequest++;
  geoAttempted = true;
  geoPending = false;
  location = null;
  radius = 0;
  order = "name";
  manualSelection = false;
  updateGeoStatus("Explorando Caraguatatuba · sem localização do usuário");
  if (map) map.setView([-23.612, -45.398], 12);
  drawResults();
  if ($("#order")) {
    $("#order").value = "name";
    $('#order option[value="distance"]').disabled = true;
  }
}

function locate() {
  if (geoPending) return;
  geoAttempted = true;
  const request = ++geoRequest;
  if (!navigator.geolocation) {
    updateGeoStatus(
      "Localização indisponível. Escolha um ponto manual ou explore Caraguatatuba.",
    );
    return;
  }
  geoPending = true;
  updateGeoStatus("Buscando sua localização");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (request !== geoRequest) return;
      geoPending = false;
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      ) {
        updateGeoStatus(
          "Localização inválida. Escolha um ponto manual ou explore Caraguatatuba.",
        );
        return;
      }
      setOrigin({
        lat,
        lng,
        accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
        source: "device",
      });
    },
    (error) => {
      if (request !== geoRequest) return;
      geoPending = false;
      updateGeoStatus(
        `${error.code === 1 ? "Permissão de localização negada" : error.code === 3 ? "Tempo de busca de localização esgotado" : "Localização indisponível"}. Escolha um ponto manual ou explore Caraguatatuba.`,
      );
    },
    { timeout: 10000, maximumAge: 30000, enableHighAccuracy: true },
  );
}
function categoriesPage() {
  app.innerHTML = `<span class="eyebrow">ENCONTRE SEU PRÓXIMO PLANO</span><h1>Um pouco de tudo. Para você.</h1><p>Explore a cidade do seu jeito.</p><div class="grid">${categories.map((c) => `<button class="category" data-category="${c.id}"><span class="symbol" style="color:${c.color}">${c.icon}</span><b>${c.name}</b><small>${all().filter((p) => p.category === c.id).length} exemplos para descobrir →</small></button>`).join("")}</div>`;
}
function categoryPage() {
  app.innerHTML = `<button data-go="categorias">← Categorias</button><div class="intro" style="margin-top:20px"><div><span class="eyebrow">EXPLORE CARAGUATATUBA</span><h1>${cat(filter).name}</h1></div>${search()}</div><p id="filter-summary" class="filter-summary">${filterSummary()}</p>${filterControls()}<div class="toolbar"><button id="category-map">⌖ Ver categoria no mapa</button><button id="locate">⌖ Minha localização</button></div><div class="grid places" id="results" style="margin-top:20px"></div>`;
  drawResults();
}
function favoritesPage() {
  const list = all().filter((p) => favorites.includes(p.id));
  app.innerHTML = `<span class="eyebrow">GUARDE SEUS ACHADOS</span><h1>Seus lugares favoritos.</h1><p>Ficam neste dispositivo durante o teste, mesmo depois de recarregar.</p>${
    list.length
      ? `<div class="grid places">${list.map(card).join("")}</div>`
      : `<div class="empty"><h2>Uma coleção de bons planos.</h2><p>Toque no coração de um lugar para guardar aqui.</p><button class="primary" data-go="mapa">Começar a explorar →</button></div><h2>Recomendados para você</h2><p>Ideias por categoria, sem personalização. Quando há avaliações, priorizamos as notas de teste deste navegador; os demais são destaques editoriais de demonstração.</p>${categories
          .map((c) => {
            const ranked = ranking(all(), reviews, c.id),
              recommended = ranked.length
                ? ranked
                : all()
                    .filter((p) => p.category === c.id)
                    .slice(0, 2);
            return `<h3>${c.short}</h3><p class="tag">${ranked.length ? "Por avaliação de teste local" : "Seleção editorial demonstrativa · sem avaliações"}</p><div class="grid places">${recommended.map(card).join("")}</div>`;
          })
          .join("")}`
  }`;
}
const platforms = {
  whatsapp: "WhatsApp",
  ifood: "iFood",
  ride: "99",
  waze: "Waze",
  maps: "Google Maps",
  tripadvisor: "Tripadvisor",
  booking: "Booking",
  tickets: "Ingressos e passeios",
  website: "Site próprio / reservas",
  official: "Site oficial do órgão responsável",
  menu: "Cardápio digital",
};
const hosts = {
  whatsapp: ["wa.me", "api.whatsapp.com"],
  ifood: ["ifood.com.br"],
  ride: ["99app.com"],
  waze: ["waze.com"],
  maps: ["google.com", "maps.google.com", "maps.app.goo.gl"],
  tripadvisor: ["tripadvisor.com", "tripadvisor.com.br"],
  booking: ["booking.com"],
  tickets: [
    "sympla.com.br",
    "eventbrite.com",
    "eventbrite.com.br",
    "getyourguide.com",
  ],
};
function validLink(value, key) {
  try {
    const u = new URL(value);
    const specific = u.pathname !== "/" || u.search.length > 0;
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (hosts[key]
        ? hosts[key].some(
            (h) => u.hostname === h || u.hostname.endsWith("." + h),
          ) && specific
        : ["website", "official", "menu"].includes(key) &&
          u.hostname.includes(".") &&
          !/^(localhost|127\.|0\.)/.test(u.hostname))
    );
  } catch {
    return false;
  }
}
function relevant(p) {
  return (
    {
      restaurantes: ["whatsapp", "menu", "ifood", "ride", "waze", "maps"],
      hospedagem: [
        "whatsapp",
        "website",
        "booking",
        "tripadvisor",
        "waze",
        "maps",
      ],
      passeios: ["whatsapp", "website", "tickets", "waze", "maps"],
      turismo: ["official", "waze", "maps"],
      eventos: ["tickets", "whatsapp", "website", "waze", "maps"],
      servicos: ["whatsapp", "website", "waze", "maps"],
    }[p.category] || []
  );
}
function externalLinks(p) {
  const point =
    ["passeios", "eventos"].includes(p.category) &&
    Number.isFinite(p.info?.meetingLat) &&
    Number.isFinite(p.info?.meetingLng)
      ? { lat: p.info.meetingLat, lng: p.info.meetingLng }
      : p;
  const automatic = {
    maps: `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`,
    waze: `https://www.waze.com/ul?ll=${point.lat}%2C${point.lng}&navigate=yes`,
  };
  return `<div class="links">${relevant(p)
    .map((k) => {
      const url = p.links?.[k] || automatic[k];
      if (k === "menu" && !url && p.menu?.length)
        return '<button id="digital-menu">Cardápio digital ↓</button>';
      return url && validLink(url, k)
        ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${platforms[k]} ↗</a>`
        : "";
    })
    .join(
      "",
    )}</div><p class="footer-note">Somente canais disponíveis. Navegação para coordenadas ilustrativas${["passeios", "eventos"].includes(p.category) ? " do ponto de encontro/local cadastrado" : ""}. Links externos não são integrações de APIs.</p>`;
}
function reviewSection(p) {
  const r = summary(reviews, p.id),
    own = r.list.find((x) => x.authorId === "this-device");
  return `<section class="panel reviews-section"><h2>Avaliações no Guia Connect</h2><div class="notice">Teste local — não compartilhado entre usuários. Sem autenticação ou moderação real. Uma avaliação por lugar neste dispositivo; você pode atualizar a sua. Não usamos notas do Google ou Tripadvisor.</div><h3>${r.count ? `${r.mean.toFixed(1)} de 5 estrelas · ${r.count} avaliação${r.count > 1 ? "s" : ""} de teste` : "Ainda sem avaliações"}</h3>${r.list.map((x) => `<article class="local-review"><b>${"★".repeat(x.stars)}${"☆".repeat(5 - x.stars)} · Visitante de teste</b><p>${escape(x.comment)}</p><small>Teste local · ${escape(new Date(x.createdAt).toLocaleDateString("pt-BR"))}</small></article>`).join("")}<form id="review-form" data-id="${p.id}"><fieldset class="stars-field"><legend>Sua nota de teste</legend>${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="stars" value="${n}" required ${own?.stars === n ? "checked" : ""}>${n} ★</label>`).join("")}</fieldset><label>Comentário de teste<textarea name="comment" required minlength="3" maxlength="600" placeholder="Use apenas dados fictícios.">${escape(own?.comment || "")}</textarea></label><p id="review-error" class="error" role="alert"></p><button class="primary" type="submit">${own ? "Atualizar" : "Salvar"} avaliação neste dispositivo</button>${own ? `<button type="button" data-delete-review="${p.id}">Remover minha avaliação de teste</button>` : ""}</form><p class="footer-note">A estrutura separa a origem local de futuras avaliações autenticadas. Identidade por usuário, denúncia e moderação dependerão do backend; o dispositivo não prova identidade.</p></section>`;
}
function detailContent(p, compact = false) {
  return `<img class="${compact ? "sheet-photo" : "detail-hero"}" src="${escape(p.image)}" alt="Imagem ilustrativa de ${escape(p.name)}"><span class="eyebrow">${cat(p.category).name} · ${escape(p.district)}</span><h${compact ? "2" : "1"}>${escape(p.name)}</h${compact ? "2" : "1"}><button class="sheet-fav ${favorites.includes(p.id) ? "saved" : ""}" data-fav="${p.id}" aria-label="Favoritar ${escape(p.name)}" aria-pressed="${favorites.includes(p.id)}">${icon("heart")}</button><p class="rating-label">${ratingLabel(p)}</p><p>⌖ ${escape(p.address)} · ${escape(p.district)}</p><p class="distance">${distanceLabel(p)}</p><div class="notice">Exemplo fictício · fotos, posição, horários e informações ilustrativos.</div><p>${escape(p.description)}</p>${externalLinks(p)}${!compact || expanded ? `<p>◷ ${escape(p.hours)}</p><p>☏ ${escape(p.contact)}</p><p>Coordenadas ilustrativas: ${p.lat}, ${p.lng}</p><section class="panel" id="specific-info"><h2>${p.category === "restaurantes" ? "Cardápio demonstrativo" : "Prepare sua visita"}</h2>${specific(p)}</section>${reviewSection(p)}` : ""}`;
}
function showSheet(id) {
  const p = all().find((x) => x.id === id);
  if (!p) return;
  selectedPlace = id;
  const sheet = $("#place-sheet");
  if (!sheet) return;
  sheet.classList.remove("hidden");
  sheet.classList.toggle("expanded", expanded);
  sheet.innerHTML = `<div class="sheet-handle"></div><div class="sheet-actions"><button id="expand-sheet" aria-expanded="${expanded}">${icon(expanded ? "collapse" : "expand")} ${expanded ? "Recolher" : "Expandir detalhes"}</button><button id="close-sheet" aria-label="Fechar detalhes">${icon("close")} Fechar</button></div><div class="sheet-content">${detailContent(p, true)}</div>`;
  if (!expanded) sheet.querySelector(".sheet-content").scrollTop = 0;
}
function closeSheet() {
  selectedPlace = null;
  expanded = false;
  $("#place-sheet")?.classList.add("hidden");
  if (returnFocus?.isConnected) returnFocus.focus();
}
function openPlace(id, element) {
  returnFocus = element;
  expanded = false;
  selectedPlace = id;
  if (route() === "mapa") {
    if (view === "list") {
      view = "map";
      $(".workspace").classList.remove("list-mode");
      $(".workspace").classList.add("map-mode");
      $("#view").innerHTML = icon("menu") + " Ver lista";
      map?.invalidateSize();
    }
    showSheet(id);
    const p = all().find((x) => x.id === id);
    if (map && p) map.panTo([p.lat, p.lng]);
    $("#expand-sheet")?.focus();
  } else {
    filter = "";
    query = "";
    district = "";
    radius = 0;
    minRating = 0;
    onlyTop = false;
    view = "map";
    go("mapa");
  }
}
function submitReview(form) {
  const d = new FormData(form),
    stars = Number(d.get("stars")),
    comment = String(d.get("comment") || "").trim();
  if (
    !Number.isInteger(stars) ||
    stars < 1 ||
    stars > 5 ||
    comment.length < 3
  ) {
    $("#review-error").textContent =
      "Selecione de 1 a 5 estrelas e escreva ao menos 3 caracteres.";
    return;
  }
  const id = form.dataset.id,
    entry = {
      id: "local-" + id,
      placeId: id,
      authorId: "this-device",
      source: "local-test",
      moderationStatus: "not-moderated",
      stars,
      comment,
      createdAt: new Date().toISOString(),
    };
  reviews[id] = [
    ...(reviews[id] || []).filter((r) => r.authorId !== "this-device"),
    entry,
  ];
  const persisted = save("reviews", reviews);
  refreshReviewUI();
  toast(
    persisted
      ? "Avaliação de teste atualizada apenas neste dispositivo."
      : "Avaliação válida nesta sessão; armazenamento indisponível.",
  );
}
function refreshReviewUI() {
  if (route() === "mapa") {
    drawResults();
    if (selectedPlace) showSheet(selectedPlace);
  } else render();
}

function details(id) {
  const p = all().find((x) => x.id === id);
  if (!p) {
    app.innerHTML = empty();
    return;
  }
  app.innerHTML = `<button data-go="${session?.role === "empresa" ? "empresa" : "mapa"}">← Voltar</button><section class="full-details">${detailContent(p)}<button id="show-on-map" data-id="${id}" class="primary">Ver posição no mapa</button></section>`;
}
function specific(p) {
  if (p.category === "restaurantes") {
    return (
      "<p>Preços fictícios · cardápio local demonstrativo</p>" +
      [...new Set(p.menu.map((i) => i.section))]
        .map(
          (s) =>
            `<h3>${escape(s)}</h3>${p.menu
              .filter((i) => i.section === s)
              .map(
                (i) =>
                  `<div class="menu-item"><div><b>${escape(i.name)}</b><p>${escape(i.description)}</p></div><b>${Number(i.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></div>`,
              )
              .join("")}`,
        )
        .join("")
    );
  }
  const info = p.info || {};
  return {
    hospedagem: `<p>Comodidades: ${escape(info.amenities || "Não cadastradas")}</p><p>Reservas apenas em canais externos cadastrados.</p>`,
    passeios: `<p>Duração: ${escape(info.duration || "Não cadastrada")}</p><p>Ponto de encontro: ${escape(info.meeting || "Não cadastrado")}</p><p>Programação: ${escape(info.program || "Não cadastrada")}</p>`,
    eventos: `<p>Data demonstrativa: ${escape(info.date || "Não cadastrada")}</p><p>Horário e programação: ${escape(info.program || "Não cadastrados")}</p><p>Local: ${escape(info.meeting || "Não cadastrado")}</p>`,
    turismo: `<p>${escape(info.visit || "Informações de visitação não verificadas. Lugar fictício para teste.")}</p><p>Este exemplo não é um ponto turístico real; não há informações oficiais verificadas.</p>`,
    servicos: `<p>${escape(p.description)}</p><p>Disponibilidade e serviços demonstrativos; consulte um futuro cadastro real.</p>`,
  }[p.category];
}
function topPage() {
  app.innerHTML = `<span class="eyebrow">RANKINGS · CARAGUATATUBA/SP</span><h1>Top 10 por categoria.</h1><p>Escolha uma categoria para ver os registros avaliados neste navegador.</p><div class="notice">Ranking de teste local — não representa avaliações reais. Sem avaliações, não há lugares classificados.</div><div class="grid" style="margin-top:24px">${categories.map((c) => `<button class="category" data-top-category="${c.id}"><span class="symbol" style="color:${c.color}">${c.icon}</span><b>${c.short}</b><small>Ver ranking da categoria →</small></button>`).join("")}</div>`;
}
function topCategoryPage(id) {
  const members = ranking(all(), reviews, id);
  let list = members.filter(
    (p) =>
      (!topDistrict || p.district === topDistrict) &&
      (!topMin || summary(reviews, p.id).mean >= topMin),
  );
  if (topOrder === "distance" && location)
    list.sort((a, b) => distance(a) - distance(b) || a.rank - b.rank);
  app.innerHTML = `<button data-go="top">← Categorias do Top 10</button><span class="eyebrow" style="display:block;margin-top:20px">CARAGUATATUBA/SP</span><h1>Top 10 · ${cat(id).short}</h1><div class="notice">Ranking de teste local — não representa avaliações reais. Nota média decrescente; desempate por quantidade de avaliações e ID estável. Somente lugares avaliados entram, até dez por categoria.</div><p>A ordem por distância reorganiza os integrantes e preserva sua posição original no ranking. Distâncias em linha reta${location?.source === "manual" ? " a partir do ponto manual" : ""}.</p><div class="toolbar"><select id="top-order" aria-label="Ordenar Top 10"><option value="rating" ${topOrder === "rating" ? "selected" : ""}>Avaliação Guia Connect</option><option value="distance" ${!location ? "disabled" : ""} ${topOrder === "distance" ? "selected" : ""}>Distância ${!location ? "(sem localização)" : ""}</option></select><select id="top-district" aria-label="Bairro no Top 10"><option value="">Todos os bairros</option>${[...new Set(all().map((p) => p.district))].map((d) => `<option ${topDistrict === d ? "selected" : ""}>${escape(d)}</option>`).join("")}</select><select id="top-min" aria-label="Nota mínima no Top 10"><option value="0">Todas as notas</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${topMin === n ? "selected" : ""}>A partir de ${n} ★</option>`).join("")}</select></div>${list.length ? list.map((p) => `<article class="rank" data-rank="${p.rank}"><strong>${String(p.rank).padStart(2, "0")}</strong><img src="${escape(p.image)}" alt="Imagem ilustrativa"><div><h3>${escape(p.name)}</h3><p>${ratingLabel(p)}</p><small>${distanceLabel(p)}</small></div><div class="rank-actions"><button data-fav="${p.id}" class="rank-favorite ${favorites.includes(p.id) ? "saved" : ""}" aria-label="Favoritar ${escape(p.name)}" aria-pressed="${favorites.includes(p.id)}">${icon("heart")}</button><button data-place="${p.id}">Conhecer ↗</button></div></article>`).join("") : '<div class="empty"><h3>Nenhum registro elegível.</h3><p>Avalie um exemplo no guia para testar este ranking ou ajuste os filtros.</p><button data-go="mapa">Explorar o guia</button></div>'}`;
}
function profilePage() {
  app.innerHTML = `<section class="profile"><span class="eyebrow">SEU ESPAÇO NA CIDADE</span><h1>Olá, ${escape(session?.name || "visitante")}.</h1><div class="panel"><div class="avatar">${escape((session?.name || "V").slice(0, 1).toUpperCase())}</div><h3>${escape(session?.name || "Explorador visitante")}</h3><p>${session ? "Sessão de demonstração" : "Você está explorando sem cadastro"} · Caraguatatuba/SP</p>${!session ? '<button data-auth="cadastro" class="primary">Criar conta demonstrativa</button>' : ""}<button data-go="favoritos">♡ Meus favoritos (${favorites.length})</button>${session?.role === "empresa" ? '<button data-go="empresa">Painel da empresa</button>' : ""}</div><div class="panel"><h2>O que você gosta de descobrir?</h2><p>Preferências locais para esta demonstração.</p>${categories.map((c) => `<label><input type="checkbox" data-pref="${c.id}" ${preferences.includes(c.id) ? "checked" : ""} style="display:inline;width:auto;margin-right:10px">${c.name}</label>`).join("")}</div><div class="toolbar"><button id="logout">Sair da sessão de demonstração</button><button id="clear">Limpar dados locais de teste</button></div></section>`;
}
function businessPage() {
  if (session?.role !== "empresa") {
    app.innerHTML =
      '<div class="empty"><h2>Painel demonstrativo da empresa</h2><p>Escolha “Sou empresa” na tela inicial para editar o estabelecimento de exemplo.</p><button data-go="welcome">Ir para acesso</button></div>';
    return;
  }
  const p = { ...all()[0], ...(previewData || {}) };
  app.innerHTML = `<div class="intro"><div><span class="eyebrow">ESPAÇO DA EMPRESA · DEMONSTRAÇÃO</span><h1>Minha empresa</h1><p>${escape(p.name)} · ${escape(cat(p.category).short)}</p></div><button data-go="mapa">Acessar o guia ↗</button></div><div class="notice">As alterações ficam apenas neste navegador. Não são publicadas para outros usuários. Não insira informações pessoais ou confidenciais.</div><div class="detail-layout" style="margin-top:24px"><form id="business" class="panel"><h2>Informações do estabelecimento</h2><label>Nome<input name="name" required maxlength="80" value="${escape(p.name)}"></label><label>Categoria<select name="category">${categories.map((c) => `<option value="${c.id}" ${c.id === p.category ? "selected" : ""}>${c.name}</option>`).join("")}</select></label><label>Descrição<textarea name="description" required maxlength="1000">${escape(p.description)}</textarea></label><div class="form-grid"><label>Bairro<select name="district">${[...new Set(places.map((x) => x.district))].map((d) => `<option ${d === p.district ? "selected" : ""}>${escape(d)}</option>`).join("")}</select></label><label>Contato demonstrativo<input name="contact" maxlength="100" value="${escape(p.contact)}"></label></div><label>Endereço demonstrativo<input name="address" required maxlength="150" value="${escape(p.address)}"></label><label>Horários demonstrativos<input name="hours" required maxlength="150" value="${escape(p.hours)}"></label><h2>Posição e fotos</h2><p>Coordenadas do exemplo e imagem ilustrativa; não publique dados reais nesta demonstração.</p><div class="form-grid"><label>Latitude<input type="number" name="lat" required min="-90" max="90" step="any" value="${p.lat}"></label><label>Longitude<input type="number" name="lng" required min="-180" max="180" step="any" value="${p.lng}"></label></div><label>URL da foto ilustrativa ou autorizada<input type="url" name="image" value="${p.image === "illustration.svg" ? "" : escape(p.image)}" placeholder="https://… (vazio usa ilustração local)"></label><h2>Informações por categoria</h2>${Object.entries(
    {
      amenities: "Comodidades de hospedagem",
      duration: "Duração do passeio",
      meeting: "Ponto de encontro / local do evento",
      program: "Horário e programação",
      date: "Data demonstrativa do evento",
      visit: "Informações de visitação",
    },
  )
    .map(
      ([k, v]) =>
        `<label data-info="${k}">${v}<input name="info-${k}" ${k === "date" ? 'type="date"' : ""} value="${escape(p.info?.[k] || "")}"></label>`,
    )
    .join(
      "",
    )}<div class="form-grid" data-info="meeting-coordinates"><label>Latitude do ponto de encontro / evento (opcional)<input type="number" step="any" min="-90" max="90" name="info-meetingLat" value="${p.info?.meetingLat ?? ""}"></label><label>Longitude do ponto de encontro / evento (opcional)<input type="number" step="any" min="-180" max="180" name="info-meetingLng" value="${p.info?.meetingLng ?? ""}"></label></div><h2>Links externos específicos</h2><p>Use HTTPS e um destino específico do estabelecimento na plataforma indicada. Deixe em branco quando não houver link.</p>${Object.entries(
    platforms,
  )
    .map(
      ([k, v]) =>
        `<label data-platform="${k}">${v}<input type="url" name="link-${k}" placeholder="https://…" value="${escape(p.links?.[k] || "")}"></label>`,
    )
    .join(
      "",
    )}<section id="menu-editor" ${p.category !== "restaurantes" ? 'class="hidden"' : ""}><h2>Cardápio demonstrativo</h2>${p.menu.map((i, n) => `<fieldset style="border:1px solid var(--line);border-radius:12px;margin-bottom:15px"><legend>Item ${n + 1}</legend><label>Seção<input name="section-${n}" required value="${escape(i.section)}"></label><label>Nome do item<input name="item-${n}" required value="${escape(i.name)}"></label><label>Descrição<input name="desc-${n}" value="${escape(i.description)}"></label><label>Preço fictício (R$)<input name="price-${n}" type="number" min="0" max="99999" step="0.01" required value="${i.price}"></label></fieldset>`).join("")}</section><p id="business-error" class="error" role="alert"></p><button class="primary" type="submit">Salvar alterações localmente</button><button type="button" id="preview">Pré-visualizar alterações</button></form><aside><div class="panel"><h3>Seu estabelecimento</h3><p>Um exemplo editável para testar a experiência de cadastro e apresentação.</p>${card(p)}<button data-place="1">Ver página salva →</button><p>Imagens e coordenadas permanecem ilustrativas.</p></div></aside></div>`;
  $("#business").addEventListener("submit", (e) => {
    e.preventDefault();
    storeBusiness(false);
  });
  $('#business [name="category"]').onchange = () => businessVisibility();
  businessVisibility();
}
function businessVisibility() {
  const c = $('#business [name="category"]').value,
    p = { category: c };
  $("#menu-editor").classList.toggle("hidden", c !== "restaurantes");
  $("#menu-editor")
    .querySelectorAll("input")
    .forEach((x) => (x.disabled = c !== "restaurantes"));
  document.querySelectorAll("[data-platform]").forEach((x) => {
    const show = relevant(p).includes(x.dataset.platform);
    x.classList.toggle("hidden", !show);
    x.querySelector("input").disabled = !show;
  });
  const allowed = {
    hospedagem: ["amenities"],
    passeios: ["duration", "meeting", "program", "meeting-coordinates"],
    eventos: ["date", "meeting", "program", "meeting-coordinates"],
    turismo: ["visit"],
    restaurantes: [],
    servicos: [],
  }[c];
  document.querySelectorAll("[data-info]").forEach((x) => {
    const show = allowed.includes(x.dataset.info);
    x.classList.toggle("hidden", !show);
    x.querySelectorAll("input").forEach((i) => (i.disabled = !show));
  });
}
function businessData() {
  const form = $("#business");
  if (!form.reportValidity()) return null;
  const data = new FormData(form),
    original = all()[0],
    links = { ...original.links };
  for (const k of relevant({ category: data.get("category") })) {
    const v = String(data.get("link-" + k) || "").trim();
    if (v && !validLink(v, k)) {
      $("#business-error").textContent =
        `${platforms[k]}: use uma URL HTTPS pertinente, específica da plataforma quando aplicável.`;
      return null;
    }
    links[k] = v;
  }
  const image = String(data.get("image") || "").trim();
  if (image && !validLink(image, "website")) {
    $("#business-error").textContent = "A foto deve usar uma URL HTTPS válida.";
    return null;
  }
  const info = { ...original.info };
  for (const key of [
    "amenities",
    "duration",
    "meeting",
    "program",
    "date",
    "visit",
  ])
    if (data.has("info-" + key))
      info[key] = String(data.get("info-" + key)).trim();
  const meetingLat = data.get("info-meetingLat"),
    meetingLng = data.get("info-meetingLng");
  if ((meetingLat && !meetingLng) || (!meetingLat && meetingLng)) {
    $("#business-error").textContent =
      "Preencha ambas as coordenadas do ponto de encontro ou deixe ambas vazias.";
    return null;
  }
  if (data.has("info-meetingLat")) {
    info.meetingLat = meetingLat ? Number(meetingLat) : null;
    info.meetingLng = meetingLng ? Number(meetingLng) : null;
  }
  return {
    name: data.get("name").trim(),
    category: data.get("category"),
    district: data.get("district"),
    description: data.get("description").trim(),
    address: data.get("address").trim(),
    contact: data.get("contact").trim(),
    hours: data.get("hours").trim(),
    lat: Number(data.get("lat")),
    lng: Number(data.get("lng")),
    image: image || "illustration.svg",
    info,
    links,
    menu:
      data.get("category") === "restaurantes"
        ? original.menu.map((_, n) => ({
            section: data.get("section-" + n).trim(),
            name: data.get("item-" + n).trim(),
            description: data.get("desc-" + n).trim(),
            price: Number(data.get("price-" + n)),
          }))
        : original.menu,
  };
}
let previewData = null;
function storeBusiness(preview) {
  const data = businessData();
  if (!data) return;
  if (!data.name || !data.description || !data.address || !data.hours) {
    $("#business-error").textContent =
      "Preencha os campos obrigatórios sem usar apenas espaços.";
    return;
  }
  if (preview) {
    previewData = data;
    const original = edits["1"];
    edits["1"] = data;
    details("1");
    edits["1"] = original;
    app.insertAdjacentHTML(
      "afterbegin",
      '<div class="notice">Pré-visualização das alterações ainda não salvas. Volte ao formulário para salvar.</div>',
    );
    return;
  }
  edits["1"] = data;
  const persisted = save("edits", edits);
  previewData = null;
  toast(
    persisted
      ? "Alterações salvas somente neste navegador."
      : "Alterações válidas nesta sessão; armazenamento indisponível.",
  );
  render();
}
function modal(html) {
  dialog.innerHTML =
    '<button class="dialog-close" id="close-dialog" aria-label="Fechar">×</button>' +
    html;
  dialog.showModal();
}
function auth(kind) {
  modal(
    `<span class="eyebrow">${role === "empresa" ? "EMPRESA" : "CLIENTE"} · ACESSO DEMONSTRATIVO</span><h2>${kind === "cadastro" ? "Crie seu perfil de teste" : "Que bom ter você aqui."}</h2><p>Sem autenticação real. Não solicitamos nem armazenamos senhas. Use dados fictícios.</p><form id="auth"><label>Nome demonstrativo<input name="name" required maxlength="60" placeholder="Como podemos chamar você?"></label><label>E-mail demonstrativo<input type="email" name="email" required placeholder="exemplo@teste.com"></label><button class="primary" type="submit">${kind === "cadastro" ? "Criar perfil de demonstração" : "Entrar na demonstração"} →</button></form>`,
  );
  $("#auth").onsubmit = (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get("name").trim();
    if (!name) {
      e.target.elements.name.setCustomValidity("Informe um nome.");
      e.target.reportValidity();
      e.target.elements.name.oninput = () =>
        e.target.elements.name.setCustomValidity("");
      return;
    }
    session = { name, role };
    dialog.close();
    go(role === "empresa" ? "empresa" : "mapa");
  };
}
function render() {
  if (map) {
    mapViewport = {
      center: [map.getCenter().lat, map.getCenter().lng],
      zoom: map.getZoom(),
    };
    map.remove();
    map = null;
    markerLayer = null;
    positionLayer = null;
  }
  $("#overlay-root").innerHTML = "";
  const current = route();
  app.classList.toggle("page-map", current === "mapa");
  app.scrollTop = 0;
  if (current !== "mapa") {
    selectedPlace = null;
    expanded = false;
  }
  nav(
    current.startsWith("categoria/")
      ? "categorias"
      : current.startsWith("top/")
        ? "top"
        : current.startsWith("lugar/")
          ? "mapa"
          : current,
  );
  if (current === "welcome") welcome();
  else if (current === "mapa") mapPage();
  else if (current === "categorias") categoriesPage();
  else if (current.startsWith("categoria/")) {
    filter = current.split("/")[1];
    categoryPage();
  } else if (current === "favoritos") favoritesPage();
  else if (current === "top") topPage();
  else if (current.startsWith("top/")) topCategoryPage(current.split("/")[1]);
  else if (current === "perfil") profilePage();
  else if (current === "empresa") businessPage();
  else if (current.startsWith("lugar/")) details(current.split("/")[1]);
  else go("mapa");
}
function resetFilters() {
  query = "";
  filter = "";
  district = "";
  radius = 0;
  minRating = 0;
  onlyTop = false;
  if ($("#search")) $("#search").value = "";
  if ($("#district")) $("#district").value = "";
  drawResults();
  $("#suggestions")?.classList.add("hidden");
}
function suggestions() {
  const node = $("#suggestions");
  if (!node) return;
  const items = results().slice(0, 5);
  node.classList.toggle("hidden", !query.trim());
  node.innerHTML = query.trim()
    ? items.length
      ? items
          .map(
            (p) =>
              `<button data-place="${p.id}"><b>${escape(p.name)}</b><small>${cat(p.category).short} · ${escape(p.district)}</small></button>`,
          )
          .join("")
      : "<p>Nenhuma sugestão com os filtros atuais.</p>"
    : "";
  $("#search")?.setAttribute("aria-expanded", !!query.trim());
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.go) {
    if (b.dataset.go === "mapa") view = "map";
    go(b.dataset.go);
  }
  if (b.dataset.place) openPlace(b.dataset.place, b);
  if (b.dataset.fav) favorite(b.dataset.fav);
  if (b.dataset.deleteReview) {
    reviews[b.dataset.deleteReview] = (
      reviews[b.dataset.deleteReview] || []
    ).filter((r) => r.authorId !== "this-device");
    save("reviews", reviews);
    refreshReviewUI();
  }
  if (b.dataset.topCategory) {
    topDistrict = "";
    topMin = 0;
    topOrder = "rating";
    go("top/" + b.dataset.topCategory);
  }
  if (b.dataset.category) {
    query = "";
    district = "";
    radius = 0;
    minRating = 0;
    onlyTop = false;
    order = location ? "distance" : "name";
    go("categoria/" + b.dataset.category);
  }
  if (b.dataset.role) {
    role = b.dataset.role;
    welcome();
  }
  if (b.dataset.auth) {
    if (route() === "perfil") role = "cliente";
    auth(b.dataset.auth);
  }
  switch (b.id) {
    case "guest":
      session = null;
      go("mapa");
      break;
    case "close-dialog":
      dialog.close();
      break;
    case "city":
      modal(
        "<h2>Novos caminhos vêm aí.</h2><p>Município ativo: <b>Caraguatatuba/SP</b></p><p>São Sebastião · expansão futura<br>Ubatuba · expansão futura<br>Ilhabela · expansão futura</p>",
      );
      break;
    case "locate":
      locate();
      break;
    case "manual-location":
      manualLocation();
      break;
    case "pick-map":
      geoRequest++;
      geoPending = false;
      geoAttempted = true;
      manualSelection = true;
      dialog.close();
      view = "map";
      if (route() !== "mapa") go("mapa");
      else render();
      updateGeoStatus("Toque no mapa para escolher um ponto manual.");
      break;
    case "explore-city":
      exploreCity();
      break;
    case "view":
      view = view === "map" ? "list" : "map";
      render();
      break;
    case "fallback-list":
      view = "list";
      render();
      break;
    case "category-map":
      view = "map";
      go("mapa");
      break;
    case "reset":
      resetFilters();
      if (route().startsWith("categoria/")) go("mapa");
      break;
    case "clear-search":
      query = "";
      $("#search").value = "";
      drawResults();
      suggestions();
      $("#search").focus();
      break;
    case "list-filters":
    case "open-filters":
      filtersModal();
      break;
    case "expand-sheet":
      expanded = !expanded;
      showSheet(selectedPlace);
      $("#expand-sheet").focus();
      break;
    case "close-sheet":
      closeSheet();
      break;
    case "digital-menu":
      if (
        $("#place-sheet") &&
        !$("#place-sheet").classList.contains("hidden")
      ) {
        expanded = true;
        showSheet(selectedPlace);
      }
      $("#specific-info")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      break;
    case "logout":
      session = null;
      go("welcome");
      break;
    case "clear":
      modal(
        '<h2>Limpar seus dados de teste?</h2><p>Isso remove favoritos, preferências, avaliações e edições empresariais deste dispositivo.</p><button id="confirm-clear" class="primary">Sim, limpar dados</button>',
      );
      break;
    case "confirm-clear":
      favorites = [];
      edits = {};
      preferences = [];
      reviews = {};
      previewData = null;
      for (const k of ["favorites", "edits", "preferences", "reviews"]) {
        try {
          localStorage.removeItem("gc-" + k);
        } catch {}
      }
      dialog.close();
      render();
      toast("Dados locais removidos.");
      break;
    case "preview":
      storeBusiness(true);
      break;
    case "show-on-map":
      openPlace(b.dataset.id, b);
      break;
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "review-form") {
    e.preventDefault();
    submitReview(e.target);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    query = e.target.value;
    drawResults();
    suggestions();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "district") {
    district = e.target.value;
    drawResults();
  }
  if (e.target.id === "order") {
    order = e.target.value;
    drawResults();
  }
  if (e.target.id === "top-order") {
    topOrder = e.target.value;
    render();
  }
  if (e.target.id === "top-district") {
    topDistrict = e.target.value;
    render();
  }
  if (e.target.id === "top-min") {
    topMin = Number(e.target.value);
    render();
  }
  if (e.target.dataset.pref) {
    const id = e.target.dataset.pref;
    preferences = e.target.checked
      ? [...preferences, id]
      : preferences.filter((x) => x !== id);
    save("preferences", preferences);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSheet();
    $("#suggestions")?.classList.add("hidden");
    $("#search")?.setAttribute("aria-expanded", "false");
  }
  if (e.target.id === "search" && e.key === "ArrowDown") {
    e.preventDefault();
    $("#suggestions button")?.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    $("#suggestions")?.classList.add("hidden");
    $("#search")?.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener(
  "error",
  (e) => {
    if (
      e.target.tagName === "IMG" &&
      !e.target.classList.contains("leaflet-tile") &&
      !e.target.classList.contains("leaflet-marker-icon") &&
      !e.target.dataset.fallback
    ) {
      e.target.dataset.fallback = "true";
      e.target.src = "illustration.svg";
    }
  },
  true,
);
window.addEventListener("hashchange", () => {
  render();
  app.scrollTop = 0;
});
render();

function syncViewport() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty(
    "--viewport-height",
    height + "px",
  );
  document.documentElement.style.setProperty(
    "--keyboard-offset",
    (window.visualViewport?.offsetTop || 0) + "px",
  );
  requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
}
window.visualViewport?.addEventListener("resize", syncViewport);
window.addEventListener("resize", syncViewport);
document.addEventListener("focusin", (e) => {
  if (e.target.matches("input,textarea,select") && e.target.id !== "search") {
    setTimeout(() => {
      if (e.target.isConnected)
        e.target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 250);
  }
});
syncViewport();
