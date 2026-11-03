/**
 * tracker-card.js — Carte Présence et téléphone pour Home Assistant
 * https://github.com/Marlboro62/tracker
 *
 * Présence d'une personne et état de son téléphone (application compagnon) :
 * batterie, charge, activité, distance, sonnerie, notifications, alarme,
 * Wi-Fi, données mobiles, Bluetooth, SIM, GPS, adresse, IP publique.
 *
 *   type: custom:tracker-card
 *   person: person.prenom            # le reste est détecté à partir de la personne
 *
 * Toutes les entités du téléphone peuvent être indiquées à la main sous « phone: ».
 */

const CARD_VERSION = "1.0.0-beta.1";

const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BAD = new Set(["unavailable", "unknown", "none", "null", ""]);
const ok = (v) => v != null && !BAD.has(String(v).toLowerCase().trim());

/* ------------------------------------------------------------------ thèmes */
const THEME_CSS = `
:host{
  --g-bg:#1a2434;--g-deep:#131c2a;--g-panel:#212d40;
  --g-acc:#1d93e3;--g-acc2:#7cc4ff;--g-edge:#5b7fb0;--g-text:#e7edf5;--g-muted:#b4c3d8;
  --ok:#2ecc71;--warn:#f5a623;--err:#ff5c6c;--info:#1d93e3;--violet:#a06cff;
  --g-font:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,'Noto',sans-serif));
  --g-font-m:var(--code-font-family,ui-monospace,monospace);
}
:host([data-theme="light"]){
  --g-bg:#ffffff;--g-deep:#eef2f7;--g-panel:#f2f5f9;
  --g-acc:#1673b8;--g-acc2:#1673b8;--g-edge:#9fb3cc;--g-text:#1a2434;--g-muted:#5b6b82;
  --ok:#1e9e55;--warn:#c47d00;--err:#d6334a;--info:#1673b8;--violet:#7a45d6;
}
:host([data-theme="ha"]){
  --g-bg:var(--ha-card-background,var(--card-background-color,#fff));
  --g-deep:color-mix(in srgb,var(--primary-text-color,#000) 7%,var(--g-bg));
  --g-panel:color-mix(in srgb,var(--primary-text-color,#000) 4%,var(--g-bg));
  --g-acc:var(--primary-color,#03a9f4);--g-acc2:var(--primary-color,#03a9f4);--g-edge:var(--primary-color,#03a9f4);
  --g-text:var(--primary-text-color,#212121);--g-muted:var(--secondary-text-color,#727272);
  --ok:var(--success-color,#43a047);--warn:var(--warning-color,#ffa600);--err:var(--error-color,#db4437);--info:var(--info-color,#039be5);
}
`;
const THEMES = [
  ["v2", "Style MyElectricalData (bleu nuit)"],
  ["auto", "Style MyElectricalData, clair ou sombre selon Home Assistant"],
  ["ha", "Thème Home Assistant (clair ou sombre)"],
];
const applyTheme = (el, theme, hass) => {
  const t = theme || "v2", light = hass?.themes?.darkMode === false;
  el.setAttribute("data-theme", t === "ha" ? "ha" : t === "auto" && light ? "light" : "v2");
};

const CSS = THEME_CSS + `
:host{display:block;font-family:var(--g-font);font-size:16px;}
*{box-sizing:border-box;}
ha-card{
  display:block;position:relative;overflow:hidden;background:var(--g-bg);color:var(--g-text);
  border-radius:16px;border:1px solid color-mix(in srgb,var(--g-edge) 22%,transparent);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 8px 28px rgba(0,0,0,.45);padding:16px;
}
ha-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--g-acc),transparent);opacity:.8;}
:host([data-theme="ha"]) ha-card{box-shadow:var(--ha-card-box-shadow,none);border-color:var(--ha-card-border-color,var(--divider-color,#e0e0e0));}
.sec{font-size:.78rem;font-weight:600;letter-spacing:2px;text-transform:uppercase;
  color:color-mix(in srgb,var(--g-acc) 85%,transparent);margin-bottom:12px;padding-bottom:6px;
  border-bottom:1px solid color-mix(in srgb,var(--g-edge) 25%,transparent);display:flex;gap:8px;align-items:center;}
.sec .demo{margin-left:auto;color:var(--g-muted);letter-spacing:1px;}
.head{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.avatar{width:48px;height:48px;border-radius:50%;flex:none;overflow:hidden;display:flex;align-items:center;justify-content:center;
  background:var(--g-panel);border:2px solid color-mix(in srgb,var(--g-edge) 45%,transparent);
  font-size:1.3rem;font-weight:700;color:var(--g-acc2);transition:border-color .4s,box-shadow .4s;}
.avatar img{width:100%;height:100%;object-fit:cover;}
.avatar.home{border-color:var(--ok);box-shadow:0 0 12px color-mix(in srgb,var(--ok) 35%,transparent);}
.avatar.away{border-color:var(--err);box-shadow:0 0 12px color-mix(in srgb,var(--err) 25%,transparent);}
.who{flex:1;min-width:0;}
.name{font-size:1.05rem;font-weight:700;letter-spacing:.5px;color:var(--g-text);}
.state{font-size:.85rem;font-weight:600;margin-top:2px;display:flex;align-items:center;gap:4px;}
.state ha-icon{--mdc-icon-size:16px;}
.loc{font-size:.75rem;color:var(--g-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:none;}
.batmini{display:flex;align-items:center;gap:3px;font-weight:700;font-size:.9rem;cursor:pointer;}
.batmini ha-icon{--mdc-icon-size:20px;}
.chips{display:flex;gap:4px;}
.chip{display:flex;align-items:center;padding:2px 6px;border-radius:6px;border:1px solid color-mix(in srgb,var(--c,var(--g-muted)) 40%,transparent);color:var(--c,var(--g-muted));}
.chip ha-icon{--mdc-icon-size:14px;}
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.tab{flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:5px;padding:6px 8px;border-radius:8px;cursor:pointer;user-select:none;
  font-size:.72rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--g-muted);
  background:var(--g-panel);border:1px solid color-mix(in srgb,var(--g-edge) 22%,transparent);}
.tab ha-icon{--mdc-icon-size:15px;}
.tab.on{color:var(--g-acc2);border-color:color-mix(in srgb,var(--g-acc) 60%,transparent);background:color-mix(in srgb,var(--g-acc) 14%,var(--g-panel));}
.panel{display:none;}
.panel.on{display:block;}
.bat{margin-bottom:10px;cursor:pointer;}
.bat-top{display:flex;align-items:center;gap:6px;margin-bottom:5px;font-size:.72rem;letter-spacing:1.2px;text-transform:uppercase;color:var(--g-muted);}
.bat-top .v{margin-left:auto;font-size:.95rem;font-weight:700;letter-spacing:0;text-transform:none;}
.bat-top .chg{color:var(--warn);text-transform:none;letter-spacing:0;font-weight:600;display:flex;align-items:center;gap:2px;}
.bat-top .chg ha-icon{--mdc-icon-size:14px;}
.track{height:8px;border-radius:4px;background:color-mix(in srgb,var(--g-muted) 18%,transparent);overflow:hidden;}
.fill{height:100%;border-radius:4px;transition:width .6s,background .5s;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;}
.tile{padding:9px 10px;border-radius:10px;background:var(--g-panel);min-width:0;
  border:1px solid color-mix(in srgb,var(--c,var(--g-edge)) 30%,transparent);}
.tile[data-entity]{cursor:pointer;}
.tile[data-entity]:hover{border-color:color-mix(in srgb,var(--c,var(--g-acc)) 70%,transparent);}
.tile.wide{grid-column:1/-1;}
.lbl{font-size:.66rem;letter-spacing:1.2px;text-transform:uppercase;color:var(--g-muted);margin-bottom:4px;}
.row{display:flex;align-items:center;gap:6px;min-width:0;}
.row ha-icon{--mdc-icon-size:18px;color:var(--c,var(--g-acc2));flex:none;}
.val{font-size:.88rem;font-weight:600;color:var(--c,var(--g-text));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tile.wide .val{white-space:normal;}
.val.mono{font-family:var(--g-font-m);font-size:.82rem;}
.act{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:10px 12px;margin-bottom:8px;border-radius:10px;background:var(--g-panel);
  border:1px solid color-mix(in srgb,var(--g-edge) 22%,transparent);}
.act > ha-icon{--mdc-icon-size:28px;color:var(--g-acc2);}
.act .r{margin-left:auto;display:flex;gap:16px;align-items:center;}
.act .big{font-size:.95rem;font-weight:700;}
.hr{display:flex;align-items:center;gap:4px;font-weight:700;}
.hr ha-icon{--mdc-icon-size:18px;color:var(--err);animation:beat 1.15s ease-in-out infinite;}
@keyframes beat{0%,100%{transform:scale(1)}20%{transform:scale(1.22)}40%{transform:scale(1)}}
.find{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:10px;padding:8px 12px;border-radius:9px;cursor:pointer;user-select:none;
  font-size:.78rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--err);
  background:color-mix(in srgb,var(--err) 10%,transparent);border:1px solid color-mix(in srgb,var(--err) 40%,transparent);font-family:inherit;}
.find:hover,.find.busy{background:color-mix(in srgb,var(--err) 22%,transparent);}
.find ha-icon{--mdc-icon-size:18px;}
.empty{text-align:center;padding:14px 8px;font-size:.85rem;color:var(--g-muted);}
@media (max-width:420px){ha-card{padding:13px}.tab{min-width:70px}}
`;

/* --------------------------------------------------------------- libellés */
const ACTIVITY = {
  still: ["mdi:human-handsdown", "Immobile"], stationary: ["mdi:human-handsdown", "Immobile"],
  walking: ["mdi:walk", "Marche"], on_foot: ["mdi:walk", "À pied"], running: ["mdi:run", "Course"],
  in_vehicle: ["mdi:car", "En voiture"], automotive: ["mdi:car", "En voiture"],
  on_bicycle: ["mdi:bike", "À vélo"], cycling: ["mdi:bike", "À vélo"], tilting: ["mdi:phone-rotate-landscape", "Téléphone incliné"],
  unknown: ["mdi:help-circle-outline", "Inconnue"],
};
const RINGER = {
  normal: ["mdi:bell-ring", "Normale", "--ok"], vibrate: ["mdi:vibrate", "Vibreur", "--warn"], silent: ["mdi:bell-off", "Silencieux", "--err"],
};
const CHARGER = {
  ac: "Secteur", usb: "USB", wireless: "Sans fil", dock: "Dock", "ac charger": "Secteur", "usb charger": "USB", "wireless charger": "Sans fil",
};

/* Entités du téléphone détectées d'après la fin de leur identifiant (application compagnon Android et iOS). */
const PHONE_KEYS = {
  battery: [/_battery_level$/],
  charging: [/_is_charging$/],
  battery_state: [/_battery_state$/],
  charger_type: [/_charger_type$/],
  network_type: [/(?<!data)_network_type$/, /_connection_type$/],
  data_network: [/_data_network_type(_sim_\d)?$/, /_mobile_data_network_type$/],
  wifi_state: [/_wi_?fi_state$/],
  wifi_ssid: [/_wi_?fi_connection$/, /_ssid$/],
  hotspot: [/_hotspot_state$/],
  bt_state: [/_bluetooth_state$/],
  bt_conn: [/_bluetooth_connection$/],
  sim: [/_sim_1$/],
  activity: [/_detected_activity$/, /_activity$/],
  high_acc: [/_high_accuracy_mode$/],
  ringer: [/_ringer_mode$/],
  notif_count: [/_active_notification_count$/],
  next_alarm: [/_next_alarm$/],
  geocoded: [/_geocoded_location$/],
  public_ip: [/_public_ip_address$/],
  last_reboot: [/_last_reboot$/],
};
const PHONE_GROUPS = [
  ["Batterie", [["battery", "Niveau de batterie", "sensor"], ["charging", "En charge", "binary_sensor"], ["battery_state", "État de la batterie (iPhone)", "sensor"], ["charger_type", "Type de chargeur", "sensor"]]],
  ["Réseau", [["network_type", "Type de réseau", "sensor"], ["data_network", "Réseau mobile (4G, 5G…)", "sensor"], ["wifi_state", "Wi-Fi activé", "binary_sensor"], ["wifi_ssid", "Réseau Wi-Fi", "sensor"],
    ["hotspot", "Partage de connexion", "binary_sensor"], ["bt_state", "Bluetooth activé", "binary_sensor"], ["bt_conn", "Connexion Bluetooth", "sensor"], ["sim", "Carte SIM", "sensor"], ["high_acc", "GPS haute précision", "binary_sensor"]]],
  ["Activité et notifications", [["activity", "Activité détectée", "sensor"], ["ringer", "Mode de sonnerie", "sensor"], ["notif_count", "Notifications", "sensor"], ["next_alarm", "Prochaine alarme", "sensor"]]],
  ["Localisation", [["tracker", "Suivi de position (device_tracker)", "device_tracker"], ["proximity", "Distance de la maison", "sensor"], ["geocoded", "Adresse géocodée", "sensor"], ["rue", "Rue", "sensor"], ["ville", "Ville", "sensor"]]],
  ["Système", [["public_ip", "IP publique", "sensor"], ["last_reboot", "Dernier redémarrage", "sensor"]]],
];

/* ---------------------------------------------------------------- démo */
const DEMO = (() => {
  const t = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  return {
    person: { state: "not_home", name: "Camille" },
    battery: "64", charging: "on", charger_type: "wireless", network_type: "cellular", data_network: "5G", wifi_state: "off", wifi_ssid: "",
    hotspot: "off", bt_state: "on", bt_conn: "Écouteurs démo", sim: "Opérateur démo", activity: "walking", high_acc: "off",
    ringer: "vibrate", notif_count: "3", next_alarm: t(13.5), geocoded: "12 rue des Lilas, Villeneuve", rue: "12 rue des Lilas", ville: "Villeneuve",
    proximity: "2.4", public_ip: "203.0.113.42", last_reboot: t(-80), heart_rate: "78",
  };
})();

/* ------------------------------------------------------------- calculs */
const batColor = (p) => p >= 80 ? "--ok" : p >= 50 ? "--ok" : p >= 20 ? "--warn" : "--err";
const batIcon = (p, chg) => {
  if (!Number.isFinite(p)) return "mdi:battery-unknown";
  const r = Math.max(0, Math.min(100, Math.round(p / 10) * 10));
  if (chg) return r >= 100 ? "mdi:battery-charging-100" : `mdi:battery-charging-${Math.max(10, r)}`;
  return r >= 100 ? "mdi:battery" : r <= 0 ? "mdi:battery-outline" : `mdi:battery-${r}`;
};
const dataColor = (raw) => {
  const r = String(raw || "").toUpperCase();
  if (/NR|5G/.test(r)) return "--violet";
  if (/LTE|4G/.test(r)) return "--info";
  if (/HSPA|H\+|3G|UMTS/.test(r)) return "--ok";
  if (/EDGE|2G|GPRS|GSM/.test(r)) return "--warn";
  return null;
};
const hrColor = (b) => b < 60 ? "--info" : b <= 100 ? "--ok" : b <= 140 ? "--warn" : "--err";
const haversine = (a, b, c, d) => {
  const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const fmtKm = (km) => !Number.isFinite(km) ? "—" : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("fr-FR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
const fmtDate = (iso, withDay) => {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return withDay ? `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${h}` : h;
};
const attr = (st, ...names) => {
  if (!st?.attributes) return null;
  const keys = Object.keys(st.attributes);
  for (const n of names) {
    const k = keys.find((x) => x.toLowerCase() === n.toLowerCase());
    if (k && ok(st.attributes[k])) return st.attributes[k];
  }
  return null;
};

/* ================================================================ carte */
class TrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab = 0;
    this._fp = null;
  }

  static getConfigElement() { return document.createElement("tracker-card-editor"); }
  static getStubConfig(hass) {
    const p = Object.keys(hass?.states || {}).find((e) => e.startsWith("person."));
    return { person: p || "person.prenom" };
  }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  setConfig(config) {
    const c = config || {};
    this._config = { ...c, theme: c.theme || "v2", title: c.title ?? "Présence", phone: { ...(c.phone || {}) } };
    this._ents = null; this._fp = null; this._tab = 0;
    if (this._hass) this._render(true);
  }

  set hass(h) {
    this._hass = h;
    if (!this._config) return;
    applyTheme(this, this._config.theme, h);
    const ents = this._entities();
    const fp = this._config.demo ? "demo" : [this._config.person, this._config.heart_rate, ...Object.values(ents)]
      .filter(Boolean).map((e) => { const s = h.states[e]; return s ? s.state + "|" + (s.attributes?.latitude ?? "") + (s.attributes?.entity_picture ?? "") : "x"; }).join(";");
    if (fp === this._fp) return;
    this._fp = fp;
    this._render(!this.shadowRoot.querySelector("ha-card"));
  }

  /** Entités du téléphone : celles de la configuration, puis celles trouvées à partir de la personne. */
  _entities() {
    if (this._ents && this._entsFor === this._hass?.states) return this._ents;
    const h = this._hass, cfg = this._config, out = {};
    const person = h?.states?.[cfg.person];
    const trackers = [].concat(person?.attributes?.device_trackers || []);
    const reg = h?.entities || {};
    let tracker = cfg.phone.tracker || trackers.find((t) => reg[t]?.platform === "mobile_app") || trackers[0];
    if (tracker) out.tracker = tracker;
    const dev = tracker && reg[tracker]?.device_id;
    let pool = [];
    if (dev) pool = Object.keys(reg).filter((e) => reg[e].device_id === dev);
    else if (tracker) {
      const obj = tracker.split(".")[1];
      pool = Object.keys(h?.states || {}).filter((e) => e.split(".")[1]?.startsWith(obj + "_"));
    }
    for (const [key, res] of Object.entries(PHONE_KEYS)) {
      if (cfg.phone[key]) { out[key] = cfg.phone[key]; continue; }
      for (const re of res) {
        const hit = pool.find((e) => re.test(e) && /^(sensor|binary_sensor)\./.test(e));
        if (hit) { out[key] = hit; break; }
      }
    }
    for (const k of ["proximity", "rue", "ville"]) if (cfg.phone[k]) out[k] = cfg.phone[k];
    this._ents = out; this._entsFor = h?.states;
    return out;
  }

  /** Valeur d'une donnée : démo, ou état de l'entité correspondante. */
  _v(key) {
    if (this._config.demo) return DEMO[key] ?? null;
    const id = this._entities()[key];
    const s = id && this._hass.states[id];
    return s && ok(s.state) ? s.state : null;
  }
  _st(key) { if (this._config.demo) return null; const id = this._entities()[key]; return id ? this._hass.states[id] : null; }

  _render(full) {
    if (!this._hass || !this._config) return;
    const cfg = this._config, h = this._hass, demo = !!cfg.demo;
    const person = demo ? null : h.states[cfg.person];
    const name = demo ? DEMO.person.name : cfg.name || person?.attributes?.friendly_name || (cfg.person ? cfg.person.split(".")[1] : "Personne");
    const pic = demo ? "" : cfg.picture || person?.attributes?.entity_picture || "";
    const pstate = demo ? DEMO.person.state : person?.state;
    const home = pstate === "home";
    const zone = !pstate || !ok(pstate) ? null : home ? "À la maison" : pstate === "not_home" ? "Pas à la maison" : pstate;

    // adresse : capteurs rue/ville, sinon attributs de l'adresse géocodée
    const geoSt = this._st("geocoded");
    const geo = this._v("geocoded");
    const rue = this._v("rue") || (demo ? null : [attr(geoSt, "Sub Thoroughfare"), attr(geoSt, "Thoroughfare")].filter(Boolean).join(" ") || null);
    const ville = this._v("ville") || (demo ? null : attr(geoSt, "Locality"));
    const where = geo || [rue, ville].filter(Boolean).join(", ");

    // distance : capteur proximity, sinon calculée entre le téléphone et la maison
    let km = parseFloat(this._v("proximity"));
    const proxSt = this._st("proximity");
    if (Number.isFinite(km) && proxSt?.attributes?.unit_of_measurement === "m") km /= 1000;
    if (!Number.isFinite(km) && !demo && !home) {
      const src = this._st("tracker") || person;
      const la = parseFloat(src?.attributes?.latitude), lo = parseFloat(src?.attributes?.longitude);
      const hz = h.states["zone.home"]?.attributes;
      const hla = parseFloat(hz?.latitude ?? h.config?.latitude), hlo = parseFloat(hz?.longitude ?? h.config?.longitude);
      if ([la, lo, hla, hlo].every(Number.isFinite)) km = haversine(la, lo, hla, hlo);
    }

    // batterie
    const batRaw = this._v("battery"), bat = parseFloat(batRaw);
    const bstate = String(this._v("battery_state") || "").toLowerCase();
    const charging = this._v("charging") === "on" || bstate === "charging" || bstate === "full";
    const ctype = String(this._v("charger_type") || "").toLowerCase();
    const charger = CHARGER[ctype] || (ok(ctype) && ctype !== "none" ? ctype : "");
    const bc = batColor(bat);

    // réseau
    const ssidRaw = this._v("wifi_ssid");
    const ssid = ssidRaw && !/not connected/i.test(ssidRaw) ? ssidRaw : null;
    const wifiOn = this._v("wifi_state") === "on" || (this._v("wifi_state") == null && !!ssid);
    const net = String(this._v("network_type") || "").toLowerCase().replace(/[-\s]/g, "");
    const dn = this._v("data_network");
    const hasHot = !!(demo || this._entities().hotspot), hotOn = this._v("hotspot") === "on";

    const E = this._entities();
    // clé simple ou « a|b » : la première entité disponible
    const pick = (k) => k.split("|").find((x) => demo ? DEMO[x] != null : !!E[x]);
    const has = (k) => !!pick(k);
    const ent = (k) => { const x = pick(k); return demo || !x ? "" : ` data-entity="${esc(E[x])}"`; };
    const tile = (k, label, icon, val, color, extra = "") => has(k)
      ? `<div class="tile${extra}"${ent(k)} style="${color ? `--c:var(${color})` : ""}"><div class="lbl">${esc(label)}</div><div class="row"><ha-icon icon="${esc(icon)}"></ha-icon><span class="val${extra.includes("mono") ? " mono" : ""}">${esc(val ?? "—")}</span></div></div>`
      : "";

    // onglet Téléphone
    const act = String(this._v("activity") || "").toLowerCase().trim();
    const [aIcon, aLbl] = ACTIVITY[act] || (ok(act) ? ["mdi:motion-sensor", act] : ACTIVITY.unknown);
    const hrSt = demo ? null : cfg.heart_rate && h.states[cfg.heart_rate];
    const hr = parseInt(demo ? DEMO.heart_rate : hrSt && ok(hrSt.state) ? hrSt.state : NaN, 10);
    const ring = String(this._v("ringer") || "").toLowerCase();
    const [rIcon, rLbl, rCol] = RINGER[ring] || ["mdi:bell-outline", ring || "—", null];
    const nc = parseInt(this._v("notif_count"), 10);
    const ncCol = !Number.isFinite(nc) ? null : nc > 10 ? "--err" : nc > 0 ? "--warn" : "--ok";
    const alarmIso = this._v("next_alarm");
    const alarmMs = alarmIso ? new Date(alarmIso) - Date.now() : NaN;
    const alarm = alarmIso ? fmtDate(alarmIso, true) || alarmIso : null;

    const p0 = `
      ${has("battery") ? `<div class="bat"${ent("battery")}>
        <div class="bat-top">Batterie${charging ? `<span class="chg"><ha-icon icon="mdi:flash"></ha-icon>${esc(charger || "En charge")}</span>` : ""}
          <span class="v" style="color:var(${bc})">${Number.isFinite(bat) ? Math.round(bat) + " %" : "—"}</span></div>
        <div class="track"><div class="fill" style="width:${Number.isFinite(bat) ? Math.max(0, Math.min(100, bat)) : 0}%;background:var(${bc})"></div></div>
      </div>` : ""}
      ${has("activity") || Number.isFinite(km) || Number.isFinite(hr) ? `<div class="act">
        <ha-icon icon="${esc(aIcon)}"></ha-icon>
        <div><div class="lbl">Activité</div><div class="big">${esc(has("activity") ? aLbl : "—")}</div></div>
        <div class="r">
          ${Number.isFinite(hr) ? `<div class="hr"><ha-icon icon="mdi:heart-pulse"></ha-icon><span style="color:var(${hrColor(hr)})">${hr} bpm</span></div>` : ""}
          ${Number.isFinite(km) ? `<div><div class="lbl">Distance</div><div class="big" style="color:var(--g-acc2)">${esc(fmtKm(km))}</div></div>` : ""}
        </div></div>` : ""}
      <div class="grid">
        ${tile("ringer", "Sonnerie", rIcon, rLbl, rCol)}
        ${tile("notif_count", "Notifications", "mdi:bell-badge-outline", Number.isFinite(nc) ? String(nc) : "—", ncCol, " mono")}
        ${tile("next_alarm", "Prochaine alarme", "mdi:alarm", alarm, alarmMs > 0 && alarmMs < 3600e3 ? "--err" : alarm ? "--warn" : null, " wide")}
      </div>
      ${cfg.find_phone_script ? `<button class="find" id="find"><ha-icon icon="mdi:cellphone-sound"></ha-icon>Faire sonner le téléphone</button>` : ""}`;

    // onglet Réseau
    const btOn = this._v("bt_state") === "on", btc = String(this._v("bt_conn") || "").trim();
    const btNone = !btc || /none|null|unknown|disconnected|aucun/i.test(btc) || btc === "0";
    const sim = this._v("sim"), simOk = sim && !/absent|no service|none/i.test(sim);
    const gps = this._v("high_acc") === "on";
    const p1 = `<div class="grid">
      ${tile("wifi_ssid|wifi_state", "Wi-Fi", wifiOn ? "mdi:wifi" : "mdi:wifi-off", wifiOn ? ssid || "Activé" : "Désactivé", wifiOn ? "--ok" : null)}
      ${tile("data_network|network_type", "Réseau mobile", "mdi:signal", dn || (net === "wifi" ? "Wi-Fi" : net === "cellular" ? "Mobile" : net || "—"), dataColor(dn), " mono")}
      ${tile("bt_state", "Bluetooth", btOn ? "mdi:bluetooth" : "mdi:bluetooth-off", btOn ? (btNone ? "Activé" : btc) : "Désactivé", btOn ? (btNone ? "--info" : "--ok") : null)}
      ${tile("sim", "Carte SIM", "mdi:sim", sim || "—", sim ? (simOk ? "--ok" : "--err") : null)}
      ${tile("high_acc", "GPS", gps ? "mdi:crosshairs-gps" : "mdi:crosshairs", gps ? "Haute précision" : "Standard", gps ? "--violet" : null)}
      ${tile("hotspot", "Partage de connexion", hotOn ? "mdi:access-point" : "mdi:access-point-off", hotOn ? "Activé" : "Désactivé", hotOn ? "--warn" : null)}
      ${rue ? `<div class="tile"${ent(E.rue ? "rue" : "geocoded")}><div class="lbl">Rue</div><div class="row"><ha-icon icon="mdi:road-variant"></ha-icon><span class="val">${esc(rue)}</span></div></div>` : ""}
      ${ville ? `<div class="tile"${ent(E.ville ? "ville" : "geocoded")}><div class="lbl">Ville</div><div class="row"><ha-icon icon="mdi:city-variant-outline"></ha-icon><span class="val">${esc(ville)}</span></div></div>` : ""}
    </div>`;

    // onglet Infos
    const rb = this._v("last_reboot");
    const p2 = `<div class="grid">
      ${tile("public_ip", "IP publique", "mdi:web", this._v("public_ip"), null, " wide mono")}
      ${tile("last_reboot", "Dernier redémarrage", "mdi:restart", rb ? fmtDate(rb, true) || rb : null, null, " wide")}
      ${tile("geocoded", "Adresse", "mdi:map-marker-outline", geo, null, " wide")}
    </div>`;

    const panels = [["mdi:cellphone", "Téléphone", p0], ["mdi:wifi", "Réseau", p1], ["mdi:information-outline", "Infos", p2]]
      .filter(([, , p]) => /class="(tile|bat|act|find)/.test(p));
    if (this._tab >= panels.length) this._tab = 0;

    const netChip = net === "wifi" ? ["mdi:wifi", "--ok"] : net === "cellular" ? ["mdi:signal-cellular-3", "--info"] : net.includes("vpn") ? ["mdi:vpn", "--violet"] : ok(net) ? ["mdi:network-strength-off", null] : null;
    const chips = [
      has("wifi_state") || has("wifi_ssid") ? [wifiOn ? "mdi:wifi" : "mdi:wifi-off", wifiOn ? "--ok" : null, "Wi-Fi"] : null,
      hasHot && hotOn ? ["mdi:access-point", "--warn", "Partage de connexion"] : null,
      netChip && !(net === "wifi" && (has("wifi_state") || has("wifi_ssid"))) ? [...netChip, "Réseau"] : null,
    ].filter(Boolean);

    const html = `
      ${cfg.title || demo ? `<div class="sec">${esc(String(cfg.title || "").toUpperCase())}${demo ? `<span class="demo">DÉMO</span>` : ""}</div>` : ""}
      <div class="head">
        <div class="avatar ${pstate ? (home ? "home" : "away") : ""}" id="avatar"${demo || !cfg.person ? "" : ` data-entity="${esc(cfg.person)}"`}>
          ${pic ? `<img src="${esc(pic)}" alt="">` : esc((name || "?").trim().charAt(0).toUpperCase())}
        </div>
        <div class="who">
          <div class="name">${esc(name)}</div>
          <div class="state" style="color:var(${home ? "--ok" : pstate ? "--err" : "--g-muted"})"><ha-icon icon="${home ? "mdi:home" : "mdi:map-marker"}"></ha-icon>${esc(zone || (cfg.person ? "Inconnu" : "Choisissez une personne"))}</div>
          ${where ? `<div class="loc">${esc(where)}</div>` : ""}
        </div>
        <div class="side">
          ${has("battery") ? `<div class="batmini"${ent("battery")} style="color:var(${bc})"><ha-icon icon="${batIcon(bat, charging)}"></ha-icon>${Number.isFinite(bat) ? Math.round(bat) + " %" : "—"}</div>` : ""}
          ${chips.length ? `<div class="chips">${chips.map(([i, c, t]) => `<span class="chip" title="${esc(t)}" style="${c ? `--c:var(${c})` : ""}"><ha-icon icon="${i}"></ha-icon></span>`).join("")}</div>` : ""}
        </div>
      </div>
      ${panels.length > 1 ? `<div class="tabs">${panels.map(([i, l], n) => `<div class="tab${n === this._tab ? " on" : ""}" data-tab="${n}"><ha-icon icon="${i}"></ha-icon>${l}</div>`).join("")}</div>` : ""}
      ${panels.map(([, , p], n) => `<div class="panel${n === this._tab ? " on" : ""}">${p}</div>`).join("")}
      ${!panels.length && !demo ? `<div class="empty">${cfg.person ? "Aucun capteur de téléphone trouvé pour cette personne : indiquez-les dans l'éditeur (section Téléphone)." : "Choisissez une personne dans l'éditeur de la carte."}</div>` : ""}`;

    if (full || !this._card) {
      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card></ha-card>`;
      this._card = this.shadowRoot.querySelector("ha-card");
      this._card.addEventListener("click", (ev) => this._click(ev));
    }
    this._card.innerHTML = html;
  }

  _click(ev) {
    const tab = ev.target.closest(".tab");
    if (tab) {
      this._tab = +tab.dataset.tab;
      this._card.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === tab));
      this._card.querySelectorAll(".panel").forEach((p, n) => p.classList.toggle("on", n === this._tab));
      return;
    }
    if (ev.target.closest("#find")) return this._find(ev.target.closest("#find"));
    const el = ev.target.closest("[data-entity]");
    if (el) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.entity }, bubbles: true, composed: true }));
  }

  async _find(btn) {
    const id = this._config.find_phone_script;
    if (!id || this._config.demo) return;
    btn.classList.add("busy");
    try {
      const [dom] = id.split(".");
      if (dom === "button" || dom === "input_button") await this._hass.callService(dom, "press", { entity_id: id });
      else await this._hass.callService("script", "turn_on", { entity_id: id });
    } catch (e) {
      console.error("[tracker-card] impossible de lancer", id, e);
    }
    setTimeout(() => btn.classList.remove("busy"), 3000);
  }
}

/* ============================================================== éditeur */
class TrackerCardEditor extends HTMLElement {
  setConfig(config) {
    const c = config || {};
    this._config = { ...c, phone: { ...(c.phone || {}) } };
    const echo = this._last && JSON.stringify(this._last) === JSON.stringify(this._config);
    if (!this._built || !echo) this._render();
  }
  set hass(h) {
    this._hass = h;
    if (this._built) this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((p) => { p.hass = h; });
    else this._render();
  }
  _emit() {
    const cfg = { ...this._config };
    if (!Object.keys(cfg.phone || {}).length) delete cfg.phone;
    for (const k of ["name", "picture", "find_phone_script", "heart_rate"]) if (!cfg[k]) delete cfg[k];
    if (!cfg.demo) delete cfg.demo;
    this._last = JSON.parse(JSON.stringify({ ...cfg, phone: { ...(cfg.phone || {}) } }));
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
  }
  _set(k, v) { this._config = { ...this._config, [k]: v }; this._emit(); }
  _setPhone(k, v) {
    const phone = { ...this._config.phone };
    if (v) phone[k] = v; else delete phone[k];
    this._config = { ...this._config, phone }; this._emit();
  }
  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const sh = this.shadowRoot;
    if (!this._hass) { sh.innerHTML = `<div style="padding:12px;font-size:12px;color:var(--secondary-text-color,#888)">Chargement…</div>`; this._built = false; return; }
    const c = this._config;
    // entités trouvées automatiquement, affichées en indication sous chaque champ
    const probe = document.createElement("tracker-card");
    let auto = {};
    try { probe.setConfig({ ...c, phone: {} }); probe._hass = this._hass; auto = probe._entities(); } catch (e) { /* rien */ }
    sh.innerHTML = `
      <style>
        .f{margin-bottom:12px}.f label{display:block;font-size:12px;color:var(--secondary-text-color,#999);margin-bottom:3px}
        input[type=text],select{width:100%;box-sizing:border-box;padding:7px 8px;border-radius:6px;border:1px solid var(--divider-color,#555);background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color,#eee);font-size:13px}
        .ck{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px}
        details{border:1px solid var(--divider-color,#444);border-radius:10px;margin-bottom:8px}
        summary{cursor:pointer;padding:10px 12px;font-size:13px;font-weight:600}
        .b{padding:0 12px 4px}.hint{font-size:11px;color:var(--secondary-text-color,#888);margin:2px 0 0}
        .intro{font-size:12px;color:var(--secondary-text-color,#888);margin:4px 0 10px}
      </style>
      <div class="f"><label>Couleurs de la carte</label><select id="theme">${THEMES.map(([v, l]) => `<option value="${v}"${(c.theme || "v2") === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="f"><label class="ck"><input type="checkbox" id="demo"${c.demo ? " checked" : ""}> Mode démo : personne et téléphone fictifs, pour les captures d'écran</label></div>
      <div class="f"><label>Titre</label><input type="text" id="title" value="${esc(c.title ?? "Présence")}"></div>
      <div class="f"><label>Personne</label><ha-entity-picker id="person" data-domain="person"></ha-entity-picker></div>
      <div class="f"><label>Nom affiché (facultatif, sinon celui de la personne)</label><input type="text" id="name" value="${esc(c.name || "")}"></div>
      <div class="f"><label>Photo (adresse, facultatif, sinon celle de la personne)</label><input type="text" id="picture" value="${esc(c.picture || "")}"></div>
      <div class="f"><label>Bouton « Faire sonner le téléphone » : script ou bouton (facultatif)</label><ha-entity-picker id="find_phone_script" data-domain="script,button,input_button"></ha-entity-picker></div>
      <div class="f"><label>Fréquence cardiaque (montre, facultatif)</label><ha-entity-picker id="heart_rate" data-domain="sensor"></ha-entity-picker></div>
      <div class="intro"><b>Téléphone</b> : laissez vide, la carte trouve les capteurs de l'application compagnon à partir de la personne. Ne remplissez un champ que pour changer l'entité utilisée.</div>
      ${PHONE_GROUPS.map(([title, fields], gi) => `<details><summary>${esc(title)}</summary><div class="b">${fields.map(([k, l, d]) => `
        <div class="f"><label>${esc(l)}</label><ha-entity-picker class="ph" data-key="${k}" data-domain="${d}"></ha-entity-picker>
        ${!c.phone[k] && auto[k] ? `<div class="hint">Trouvée automatiquement : ${esc(auto[k])}</div>` : ""}</div>`).join("")}</div></details>`).join("")}`;
    sh.querySelectorAll("ha-entity-picker").forEach((p) => {
      p.hass = this._hass;
      p.includeDomains = p.dataset.domain.split(",");
      p.allowCustomEntity = true;
      p.value = p.classList.contains("ph") ? c.phone[p.dataset.key] || "" : c[p.id] || "";
      p.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        if (p.classList.contains("ph")) this._setPhone(p.dataset.key, ev.detail.value);
        else this._set(p.id, ev.detail.value);
      });
    });
    sh.getElementById("theme").addEventListener("change", (e) => this._set("theme", e.target.value));
    sh.getElementById("demo").addEventListener("change", (e) => this._set("demo", e.target.checked));
    for (const id of ["title", "name", "picture"]) sh.getElementById(id).addEventListener("change", (e) => this._set(id, e.target.value));
    this._built = true;
  }
}

define("tracker-card", TrackerCard);
define("tracker-card-editor", TrackerCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "tracker-card")) {
  window.customCards.push({
    type: "tracker-card",
    name: "Présence et téléphone",
    description: "Présence d'une personne et état de son téléphone : batterie, activité, distance, réseau, notifications, alarme.",
    preview: true,
    documentationURL: "https://github.com/Marlboro62/tracker",
  });
}

console.info(`%c PRÉSENCE ET TÉLÉPHONE %c ${CARD_VERSION} `, "background:#1d93e3;color:#fff;font-weight:bold;", "background:#1a2434;color:#7cc4ff;");
