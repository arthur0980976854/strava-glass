/* Strava live dashboard — SSE + DOM updates. */
(function () {
  "use strict";

  var TYPE_ICONS = {
    Run: "🏃", TrailRun: "⛰️", Ride: "🚴", VirtualRide: "🚴", GravelRide: "🚵",
    MountainBikeRide: "🚵", Swim: "🏊", Hike: "🥾", Walk: "🚶",
    WeightTraining: "🏋️", Workout: "💪", Rowing: "🚣", NordicSki: "⛷️",
  };
  var activities = [];
  var byId = {};

  function el(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }

  function fmtDuration(sec) {
    sec = Math.round(sec || 0);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min" + String(s).padStart(2, "0");
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
      " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  /* Google encoded polyline -> SVG path, for the GPS trace preview. */
  function decodePolyline(str) {
    var index = 0, lat = 0, lng = 0, coords = [];
    while (index < str.length) {
      var b, shift = 0, result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
  }
  function polylineSvg(encoded) {
    if (!encoded) return "";
    var pts;
    try { pts = decodePolyline(encoded); } catch (e) { return ""; }
    if (pts.length < 2) return "";
    var lats = pts.map(function (p) { return p[0]; }), lngs = pts.map(function (p) { return p[1]; });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var w = 260, h = 84, pad = 6;
    var spanLat = maxLat - minLat || 1e-6, spanLng = maxLng - minLng || 1e-6;
    var scale = Math.min((w - pad * 2) / spanLng, (h - pad * 2) / spanLat);
    var ox = (w - spanLng * scale) / 2, oy = (h - spanLat * scale) / 2;
    var step = Math.max(1, Math.floor(pts.length / 220));
    var d = "";
    for (var i = 0; i < pts.length; i += step) {
      var x = ox + (pts[i][1] - minLng) * scale;
      var y = h - (oy + (pts[i][0] - minLat) * scale);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return '<svg class="trace" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet"><path d="' + d + '"/></svg>';
  }

  function metric(label, value) {
    return '<div class="metric"><span class="k">' + esc(label) + '</span><span class="v">' + value + "</span></div>";
  }

  function cardHtml(a, isNew) {
    var metrics = "";
    if (a.distance_km) metrics += metric("Distance", esc(a.distance_km.toFixed(2)) + ' <i>km</i>');
    metrics += metric("Temps", esc(fmtDuration(a.elapsed_time_s || a.moving_time_s)));
    if (a.elevation_m) metrics += metric("D+", esc(a.elevation_m) + ' <i>m</i>');
    if (a.speed_kmh) metrics += metric("Vit. moy.", esc(a.speed_kmh.toFixed(1)) + ' <i>km/h</i>');
    if (a.pace) metrics += metric("Allure", esc(a.pace) + ' <i>/km</i>');
    if (a.power_w) metrics += metric("Puissance", esc(a.power_w) + ' <i>W</i>');
    if (a.heartrate_bpm) metrics += metric("FC moy.", esc(a.heartrate_bpm) + ' <i>bpm</i>');
    if (a.max_heartrate_bpm) metrics += metric("FC max", esc(a.max_heartrate_bpm) + ' <i>bpm</i>');
    if (a.calories) metrics += metric("Calories", esc(a.calories) + ' <i>kcal</i>');

    return '<article class="glass-card activity-card' + (isNew ? " is-new" : "") + '" data-id="' + a.id + '">' +
      '<header><span class="act-icon">' + (TYPE_ICONS[a.type] || "🏅") + "</span>" +
      '<div><h4>' + esc(a.name) + "</h4>" +
      '<div class="act-meta">' + esc(a.type) + " · " + esc(fmtDate(a.start_date)) + "</div></div></header>" +
      polylineSvg(a.polyline) +
      '<div class="metrics">' + metrics + "</div>" +
      '<a class="act-link" href="https://www.strava.com/activities/' + a.id + '" target="_blank" rel="noopener">Voir sur Strava →</a>' +
      "</article>";
  }

  function renderKpis() {
    var box = el("stravaKpis");
    if (!box) return;
    var weekAgo = Date.now() - 7 * 864e5;
    var week = activities.filter(function (a) { return a.start_date && new Date(a.start_date).getTime() >= weekAgo; });
    var km = week.reduce(function (s, a) { return s + (a.distance_km || 0); }, 0);
    var time = week.reduce(function (s, a) { return s + (a.elapsed_time_s || 0); }, 0);
    var deniv = week.reduce(function (s, a) { return s + (a.elevation_m || 0); }, 0);
    var items = [
      ["Activités (7j)", week.length, ""],
      ["Distance (7j)", (Math.round(km * 10) / 10).toFixed(1), "km"],
      ["Temps (7j)", fmtDuration(time), ""],
      ["Dénivelé (7j)", deniv, "m"],
    ];
    box.innerHTML = items.map(function (it) {
      return '<div class="glass-card kpi"><div class="kpi-label">' + esc(it[0]) + "</div>" +
        '<div class="kpi-value">' + esc(it[1]) + (it[2] ? ' <span class="kpi-unit">' + esc(it[2]) + "</span>" : "") + "</div></div>";
    }).join("");
  }

  function renderActivities(newIds) {
    var box = el("stravaActivities");
    if (!box) return;
    if (!activities.length) {
      box.innerHTML = '<div class="glass-card empty-state"><b>Aucune activité</b>Connecte ton compte Strava pour voir tes sorties apparaître ici, en direct.</div>';
      return;
    }
    box.innerHTML = activities.map(function (a) {
      return cardHtml(a, newIds && newIds.indexOf(a.id) !== -1);
    }).join("");
    renderKpis();
  }

  function mergeActivities(list, markNew) {
    var newIds = [];
    list.forEach(function (a) {
      if (!byId[a.id] && markNew) newIds.push(a.id);
      byId[a.id] = a;
    });
    activities = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) {
      return new Date(b.start_date || 0) - new Date(a.start_date || 0);
    });
    renderActivities(newIds);
    window.STRAVA_WEEK_KM_BY_DAY = function (fromISO, toISO) {
      return activities.reduce(function (sum, a) {
        if (!a.start_date) return sum;
        var day = String(a.start_date).slice(0, 10);
        return day >= fromISO && day <= toISO ? sum + (a.distance_km || 0) : sum;
      }, 0);
    };
    if (typeof window.renderKPIs === "function") window.renderKPIs();
    return newIds;
  }

  function setConnected(connected, athlete) {
    var connectBtn = el("btnStravaConnect");
    var disconnectBtn = el("btnStravaDisconnect");
    var account = el("stravaAccount");
    if (connectBtn) connectBtn.style.display = connected ? "none" : "";
    if (disconnectBtn) disconnectBtn.style.display = connected ? "" : "none";
    if (account) account.textContent = connected ? "Connecté" + (athlete ? " — " + athlete : "") : "Non connecté";
  }

  function setLive(on, label) {
    var dot = el("stravaLive");
    if (!dot) return;
    dot.classList.toggle("on", !!on);
    var lbl = el("stravaLiveLabel");
    if (lbl) lbl.textContent = label || (on ? "En direct" : "Hors ligne");
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._h);
    toast._h = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  async function loadActivities() {
    try {
      var res = await fetch("/api/strava/activities", { credentials: "same-origin" });
      var json = await res.json();
      setConnected(json.connected, json.athlete);
      byId = {};
      mergeActivities(json.activities || [], false);
      if (json.error) toast("Strava : " + json.error);
    } catch (e) {
      toast("Impossible de charger les activités Strava");
    }
  }

  function connectStream() {
    if (!window.EventSource) return;
    var es = new EventSource("/api/strava/stream", { withCredentials: true });
    es.addEventListener("ready", function (ev) {
      var data = JSON.parse(ev.data);
      setLive(true, data.connected ? "En direct" : "En attente de connexion");
    });
    es.addEventListener("activity", function (ev) {
      var list = JSON.parse(ev.data);
      var newIds = mergeActivities(list, true);
      if (newIds.length) toast(newIds.length + " nouvelle(s) activité(s) Strava");
    });
    es.onerror = function () {
      setLive(false, "Reconnexion…");
    };
    es.addEventListener("ping", function () { setLive(true); });
  }

  function feedStatus(text) {
    var node = el("feedStatus");
    if (node) node.textContent = text;
  }

  async function loadFeed(sync) {
    try {
      var res = await fetch("/api/feed" + (sync ? "?sync=1" : ""), { credentials: "same-origin" });
      var json = await res.json();
      var disconnect = el("btnFeedDisconnect");
      if (json.configured) {
        if (el("feedUrl") && !el("feedUrl").value) el("feedUrl").value = json.url || "";
        if (disconnect) disconnect.style.display = "";
        feedStatus(
          json.error
            ? "Flux : " + json.error
            : "Flux actif — " + (json.activities || []).length + " activité(s) · maj auto toutes les 30 s",
        );
      } else {
        if (disconnect) disconnect.style.display = "none";
        feedStatus(json.error ? "Flux : " + json.error : "Aucun flux configuré");
      }
      if ((json.activities || []).length) mergeActivities(json.activities, false);
    } catch (e) {
      feedStatus("Flux indisponible");
    }
  }

  function initFeed() {
    var connect = el("btnFeedConnect");
    if (connect) {
      connect.addEventListener("click", async function () {
        var url = (el("feedUrl") || {}).value || "";
        var token = (el("feedToken") || {}).value || "";
        feedStatus("Connexion au flux…");
        try {
          var res = await fetch("/api/feed", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: url, token: token }),
          });
          var json = await res.json();
          if (json.error) {
            feedStatus("Flux : " + json.error);
            toast(json.error);
          } else {
            toast(json.imported + " activité(s) importée(s)");
          }
          if ((json.activities || []).length) mergeActivities(json.activities, true);
          loadFeed(false);
        } catch (e) {
          feedStatus("Flux : échec de la connexion");
        }
      });
    }
    var sync = el("btnFeedSync");
    if (sync) sync.addEventListener("click", function () { feedStatus("Synchronisation…"); loadFeed(true); });
    var remove = el("btnFeedDisconnect");
    if (remove) {
      remove.addEventListener("click", async function () {
        await fetch("/api/feed", { method: "DELETE", credentials: "same-origin" });
        feedStatus("Aucun flux configuré");
        remove.style.display = "none";
        toast("Flux retiré");
      });
    }
    loadFeed(true);
  }

  function init() {
    var refresh = el("btnStravaRefresh");
    if (refresh) refresh.addEventListener("click", loadActivities);
    var disconnect = el("btnStravaDisconnect");
    if (disconnect) {
      disconnect.addEventListener("click", async function () {
        await fetch("/api/strava/activities", { method: "DELETE", credentials: "same-origin" });
        byId = {};
        activities = [];
        setConnected(false);
        renderActivities([]);
        toast("Compte Strava déconnecté");
      });
    }

    var params = new URLSearchParams(window.location.search);
    if (params.get("strava") === "connected") toast("Strava connecté 🎉");
    if (params.get("strava_error")) toast("Strava : " + params.get("strava_error"));
    if (params.get("strava") || params.get("strava_error")) {
      var nav = document.querySelector('#mainNav button[data-view="strava"]');
      if (nav) nav.click();
      window.history.replaceState({}, "", window.location.pathname);
    }

    renderActivities([]);
    loadActivities();
    initFeed();
    connectStream();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
