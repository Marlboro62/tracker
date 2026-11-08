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

const CARD_VERSION = "1.2.0";

const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BAD = new Set(["unavailable", "unknown", "none", "null", ""]);
const ok = (v) => v != null && !BAD.has(String(v).toLowerCase().trim());

/* ------------------------------------------------------------------ thèmes */
// mêmes couleurs et mêmes classes de thème que les autres cartes (Imprimantes, Météo, Linky…)
const THEMES = [
  ["v2", "Style MyElectricalData (bleu nuit)"],
  ["auto", "Style MyElectricalData, clair ou sombre selon Home Assistant"],
  ["ha", "Thème Home Assistant (clair ou sombre)"],
];
const themeClass = (theme, hass) => {
  const light = hass?.themes?.darkMode === false;
  if (theme === "ha") return `th-ha${light ? " light" : ""}`;
  if (theme === "auto") return `th-v2${light ? " light" : ""}`;
  return "th-v2";
};

const STYLE = `<style>
:host {
  --med-bg: #1a2434; --med-surface: #212d40; --med-line: #2f3d55;
  --med-text: #e7edf5; --med-muted: #8fa0b8;
  --med-green: #96d21f; --med-blue: #1d93e3; --t-red: #ee4a4a; --med-down: #5fcf8a; --pc-warn: #f0a33a; --pc-violet: #a06cff;
}
ha-card { display: block; background: var(--med-bg); color: var(--med-text); border: 1px solid var(--med-line); border-radius: 18px; overflow: hidden;
  padding-bottom: 12px; font-variant-numeric: tabular-nums; container-type: inline-size; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px 8px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tk-av { width: 40px; height: 40px; border-radius: 50%; flex: none; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer;
  background: var(--med-surface); border: 2px solid var(--med-line); font-size: 1.1rem; font-weight: 700; color: var(--med-accent, var(--med-blue)); }
.tk-av img { width: 100%; height: 100%; object-fit: cover; }
.tk-av.home { border-color: var(--med-down); } .tk-av.away { border-color: var(--pc-warn); }
.brand > div { min-width: 0; }
.title { font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.title small { font-size: .7rem; font-weight: 600; color: var(--med-muted); border: 1px solid var(--med-line); border-radius: 999px; padding: 1px 8px; }
.sub { font-size: .78rem; color: var(--med-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub b { font-weight: 600; } .sub b.home { color: var(--med-down); } .sub b.away { color: var(--pc-warn); }
.tk-side { display: flex; align-items: center; gap: 6px; flex: none; }
.tk-hero { --zc: var(--med-muted); position: relative; display: flex; align-items: flex-start; gap: 16px; padding: 18px 18px 12px;
  background: radial-gradient(130% 110% at 0% 0%, color-mix(in srgb, var(--zc) 24%, transparent), transparent 62%); }
.tk-hero.home { --zc: var(--med-down); } .tk-hero.near, .tk-hero.away { --zc: var(--pc-warn); } .tk-hero.far { --zc: var(--t-red); }
.tk-top { position: absolute; top: 10px; right: 14px; display: flex; gap: 6px; align-items: center; font-size: .7rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--med-muted); }
.tk-top small { letter-spacing: 0; text-transform: none; border: 1px solid var(--med-line); border-radius: 999px; padding: 1px 8px; }
.tk-ring { position: relative; width: 92px; height: 92px; flex: none; cursor: pointer; }
.tk-ring > svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.tk-ring circle { fill: none; stroke-width: 6; }
.tk-ring .bg { stroke: color-mix(in srgb, var(--med-muted) 22%, transparent); }
.tk-ring .fg { stroke: var(--zc); stroke-linecap: round; transition: stroke-dashoffset .6s ease, stroke .4s;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--zc) 60%, transparent)); }
.tk-face { position: absolute; inset: 11px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;
  background: var(--med-surface); font-size: 1.7rem; font-weight: 700; color: var(--med-accent, var(--med-blue)); }
.tk-face img { width: 100%; height: 100%; object-fit: cover; }
.tk-id { min-width: 0; flex: 1; display: grid; gap: 4px; padding-top: 4px; }
.tk-name { font-size: 1.4rem; font-weight: 800; letter-spacing: .3px; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-zone { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 8px; border-radius: 999px; font-size: .8rem; font-weight: 700;
  color: var(--zc); background: color-mix(in srgb, var(--zc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--zc) 45%, transparent); }
.tk-zone i { width: 8px; height: 8px; border-radius: 50%; background: var(--zc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--zc) 25%, transparent); }
.tk-addr { font-size: .78rem; color: var(--med-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: .82rem; font-weight: 600; }
.tk-meta span { display: inline-flex; align-items: center; gap: 4px; } .tk-meta ha-icon { --mdc-icon-size: 16px; color: var(--med-accent, var(--med-blue)); }
.tk-meta .tk-hr { color: var(--t-red); }
.tk-dials { display: grid; grid-template-columns: repeat(auto-fit, minmax(46px, 1fr)); gap: 10px 2px; padding: 4px 12px 12px; }
.tk-dial { display: grid; justify-items: center; gap: 4px; min-width: 0; cursor: default; }
.tk-dial[data-entity], .tk-dial[data-goto] { cursor: pointer; }
.tk-dial > div { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .86rem;
  color: var(--c, var(--med-muted)); border: 3px solid color-mix(in srgb, var(--c, var(--med-muted)) 70%, transparent);
  background: color-mix(in srgb, var(--c, var(--med-muted)) 10%, var(--med-surface)); }
.tk-dial.on > div { box-shadow: 0 0 12px color-mix(in srgb, var(--c) 45%, transparent); }
.tk-dial.off > div { border-style: dashed; opacity: .7; }
.tk-dial ha-icon { --mdc-icon-size: 20px; }
.tk-dial span { font-size: .7rem; color: var(--med-muted); max-width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-dial[data-entity]:hover > div, .tk-dial[data-goto]:hover > div { transform: scale(1.06); }
@container (max-width: 380px) { .tk-dials { grid-template-columns: repeat(auto-fit, minmax(40px, 1fr)); } .tk-ring { width: 76px; height: 76px; } .tk-face { inset: 9px; font-size: 1.4rem; } .tk-name { font-size: 1.15rem; } .tk-dial > div { width: 38px; height: 38px; font-size: .78rem; } }
.pc-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 12px 0; }
.pc-tab { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; white-space: nowrap;
  border: 1px solid var(--med-line); background: var(--med-surface); font-size: .82rem; font-weight: 600; }
.pc-tab ha-icon { --mdc-icon-size: 16px; color: var(--med-muted); }
.pc-tab small { color: var(--med-muted); font-weight: 500; }
.pc-tab.on { border-color: var(--med-accent, var(--med-blue)); box-shadow: inset 0 -2px 0 var(--med-accent, var(--med-blue)); }
.pc-tab.on ha-icon { color: var(--med-accent, var(--med-blue)); }
.pc-tab:focus-visible { outline: 2px solid var(--med-accent, var(--med-blue)); }
.panel { display: none; } .panel.on { display: block; }
.pc-sec { margin: 12px 12px 0; }
.pc-h { display: flex; align-items: center; gap: 6px; font-size: .86rem; font-weight: 600; margin: 0 2px 8px; }
.pc-h ha-icon { --mdc-icon-size: 18px; color: var(--med-accent, var(--med-blue)); }
.pc-state { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); }
.pc-state[data-entity] { cursor: pointer; }
.pc-state > ha-icon { --mdc-icon-size: 26px; color: var(--med-accent, var(--med-blue)); flex: none; }
.pc-state > div { display: grid; min-width: 0; flex: 1; }
.pc-state b { font-size: .95rem; }
.pc-state span { font-size: .76rem; color: var(--med-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-state .tk-r { display: flex; gap: 16px; align-items: center; flex: none; text-align: right; }
.pc-state .tk-r div { display: grid; }
.pc-state.ok { border-color: color-mix(in srgb, var(--med-down) 55%, transparent); } .pc-state.ok > ha-icon, .pc-state.ok b.c { color: var(--med-down); }
.pc-state.warn { border-color: var(--pc-warn); } .pc-state.warn > ha-icon, .pc-state.warn b.c { color: var(--pc-warn); }
.pc-state.bad { border-color: var(--t-red); background: color-mix(in srgb, var(--t-red) 12%, var(--med-surface)); } .pc-state.bad > ha-icon, .pc-state.bad b.c { color: var(--t-red); }
.tk-hr { color: var(--t-red); animation: tk-beat 1.15s ease-in-out infinite; }
@keyframes tk-beat { 0%, 100% { transform: scale(1); } 20% { transform: scale(1.2); } 40% { transform: scale(1); } }
.pc-bar { flex: 1; height: 9px; border-radius: 6px; background: var(--med-line); overflow: hidden; margin-top: 6px; }
.pc-bar i { display: block; height: 100%; border-radius: 6px; background: var(--med-down); }
.pc-bar.warn i { background: var(--pc-warn); } .pc-bar.bad i { background: var(--t-red); }
.pc-ts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.pc-ts.tk-g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container (min-width: 640px) { .pc-ts.tk-g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.pc-t { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); min-width: 0; }
.pc-t[data-entity], .pc-t[data-goto] { cursor: pointer; }
.pc-t[data-entity]:hover, .pc-t[data-goto]:hover { border-color: var(--med-accent, var(--med-blue)); }
.pc-t.wide { grid-column: 1 / -1; }
.pc-tt { display: flex; align-items: center; gap: 6px; font-size: .82rem; color: var(--med-muted); }
.pc-tt ha-icon { --mdc-icon-size: 18px; color: var(--c, var(--med-muted)); flex: none; }
.pc-t b { display: block; margin-top: 4px; font-size: 1rem; color: var(--c, var(--med-text)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-t.wide b, .pc-t.multi b { white-space: normal; }
.pc-t.multi b { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.pc-tn { font-size: .72rem; color: var(--med-muted); margin-top: 2px; }
.pc-xs { display: flex; flex-wrap: wrap; gap: 6px; }
.pc-x { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--med-line); font-size: .74rem; color: var(--c, var(--med-muted)); }
.pc-x[data-entity] { cursor: pointer; }
.pc-x ha-icon { --mdc-icon-size: 15px; } .pc-x b { color: var(--c, var(--med-text)); }
.tk-nl { display: grid; gap: 6px; }
.tk-n { display: flex; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); min-width: 0; }
.tk-n > ha-icon { --mdc-icon-size: 20px; color: var(--med-accent, var(--med-blue)); flex: none; margin-top: 1px; }
.tk-n > div { min-width: 0; flex: 1; display: grid; gap: 2px; }
.tk-nh { display: flex; gap: 8px; font-size: .74rem; color: var(--med-muted); } .tk-nh span:last-child { margin-left: auto; white-space: nowrap; }
.tk-n b { font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-n p { margin: 0; font-size: .8rem; color: var(--med-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.pc-btn { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 6px 10px; width: 100%;
  border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); font-size: .8rem; font-weight: 600; text-align: center; }
.pc-btn ha-icon { --mdc-icon-size: 18px; flex: none; }
.pc-btn:hover { border-color: var(--med-accent, var(--med-blue)); } .pc-btn:focus-visible { outline: 2px solid var(--med-accent, var(--med-blue)); }
.pc-btn.bad { color: var(--t-red); border-color: color-mix(in srgb, var(--t-red) 40%, transparent); }
.pc-btn.armed { color: var(--pc-warn); border-color: var(--pc-warn); background: color-mix(in srgb, var(--pc-warn) 18%, transparent); }
.empty { padding: 18px; display: flex; flex-direction: column; gap: 6px; font-size: .9rem; } .empty span { color: var(--med-muted); }
ha-card.th-ha {
  /* accent (icônes, onglets, sélections, contours) : couleur principale du thème ; les couleurs porteuses de sens restent */
  --med-accent: var(--primary-color, #1d93e3);
  --med-bg: var(--ha-card-background, var(--card-background-color, #fff));
  --med-surface: color-mix(in srgb, var(--primary-text-color, #000) 5%, transparent);
  --med-line: var(--divider-color, rgba(127, 127, 127, .25));
  --med-text: var(--primary-text-color, #1f2937); --med-muted: var(--secondary-text-color, #6b7280);
  border-radius: var(--ha-card-border-radius, 12px);
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
}
ha-card.th-ha.light, ha-card.th-v2.light { --med-down: #1d8a4b; --med-green: #4c8a0b; --pc-warn: #b0640a; --t-red: #c62f2f; --pc-violet: #7a45d6; }
ha-card.th-v2.light { --med-bg: #ffffff; --med-surface: #f2f5f9; --med-line: #dbe2ec; --med-text: #1a2434; --med-muted: #5b6b82; --med-blue: #1673b8;
  box-shadow: 0 1px 3px rgba(26, 36, 52, .08); }
@media (prefers-reduced-motion: reduce) { .tk-hr { animation: none; } }
@container (max-width: 360px) { .pc-state .tk-r { gap: 10px; } }
</style>`;

/* --------------------------------------------------------------- libellés */
const ACTIVITY = {
  still: ["mdi:human-handsdown", "Immobile"], stationary: ["mdi:human-handsdown", "Immobile"],
  walking: ["mdi:walk", "Marche"], on_foot: ["mdi:walk", "À pied"], running: ["mdi:run", "Course"],
  in_vehicle: ["mdi:car", "En voiture"], automotive: ["mdi:car", "En voiture"],
  on_bicycle: ["mdi:bike", "À vélo"], cycling: ["mdi:bike", "À vélo"], tilting: ["mdi:phone-rotate-landscape", "Téléphone incliné"],
  unknown: ["mdi:help-circle-outline", "Inconnue"],
};
const RINGER = {
  normal: ["mdi:bell-ring", "Normale", "--med-down"], vibrate: ["mdi:vibrate", "Vibreur", "--pc-warn"], silent: ["mdi:bell-off", "Silencieux", "--t-red"],
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
  // iPhone (application compagnon iOS) : concentration, activité physique, pression, stockage
  focus: [/_focus$/],
  focus_name: [/_focus_name$/],
  steps: [/_steps$/],
  walk_distance: [/_distance$/],
  floors_up: [/_floors_ascended$/],
  pressure: [/_pressure$/],
  storage: [/_storage$/],
  app_version: [/_app_version$/],
};
const PHONE_GROUPS = [
  ["Batterie", [["battery", "Niveau de batterie", "sensor"], ["charging", "En charge", "binary_sensor"], ["battery_state", "État de la batterie (iPhone)", "sensor"], ["charger_type", "Type de chargeur", "sensor"]]],
  ["Réseau", [["network_type", "Type de réseau", "sensor"], ["data_network", "Réseau mobile (4G, 5G…)", "sensor"], ["wifi_state", "Wi-Fi activé", "binary_sensor"], ["wifi_ssid", "Réseau Wi-Fi", "sensor"],
    ["hotspot", "Partage de connexion", "binary_sensor"], ["vpn", "VPN WireGuard : peer connecté (wgdashboard_monitor)", "binary_sensor"], ["bt_state", "Bluetooth activé", "binary_sensor"], ["bt_conn", "Connexion Bluetooth", "sensor"], ["sim", "Carte SIM", "sensor"], ["high_acc", "GPS haute précision", "binary_sensor"]]],
  ["Activité et notifications", [["activity", "Activité détectée", "sensor"], ["ringer", "Mode de sonnerie", "sensor"], ["notif_count", "Notifications", "sensor"], ["next_alarm", "Prochaine alarme", "sensor"]]],
  ["Localisation", [["tracker", "Suivi de position (device_tracker)", "device_tracker"], ["proximity", "Distance de la maison (facultatif, sinon calculée)", "sensor"], ["geocoded", "Adresse géocodée", "sensor"], ["rue", "Rue", "sensor"], ["ville", "Ville", "sensor"]]],
  ["Système", [["public_ip", "IP publique", "sensor"], ["last_reboot", "Dernier redémarrage", "sensor"], ["storage", "Stockage (iPhone)", "sensor"], ["app_version", "Version de l'application compagnon", "sensor"]]],
  ["iPhone", [["focus", "Concentration (Focus)", "binary_sensor"], ["focus_name", "Nom de la concentration", "sensor"], ["steps", "Pas", "sensor"], ["walk_distance", "Distance parcourue", "sensor"], ["floors_up", "Étages montés", "sensor"], ["pressure", "Pression atmosphérique", "sensor"]]],
];

/* Notifications Android : attributs « <application>_<id>_post_time », « android.title_<application>_<id> »… */
const APPS = {
  "com.whatsapp": ["WhatsApp", "mdi:whatsapp"], "com.whatsapp.w4b": ["WhatsApp Business", "mdi:whatsapp"],
  "com.google.android.apps.messaging": ["Messages", "mdi:message-text"], "com.samsung.android.messaging": ["Messages", "mdi:message-text"], "com.android.mms": ["Messages", "mdi:message-text"],
  "com.google.android.gm": ["Gmail", "mdi:gmail"], "org.telegram.messenger": ["Telegram", "mdi:send"], "org.thoughtcrime.securesms": ["Signal", "mdi:message-lock"],
  "com.facebook.orca": ["Messenger", "mdi:facebook-messenger"], "com.facebook.katana": ["Facebook", "mdi:facebook"], "com.instagram.android": ["Instagram", "mdi:instagram"],
  "com.snapchat.android": ["Snapchat", "mdi:snapchat"], "com.discord": ["Discord", "mdi:message-processing"], "com.google.android.youtube": ["YouTube", "mdi:youtube"],
  "com.spotify.music": ["Spotify", "mdi:spotify"], "com.google.android.dialer": ["Téléphone", "mdi:phone"], "com.samsung.android.dialer": ["Téléphone", "mdi:phone"],
  "com.google.android.calendar": ["Agenda", "mdi:calendar"], "com.android.vending": ["Play Store", "mdi:google-play"], "io.homeassistant.companion.android": ["Home Assistant", "mdi:home-assistant"],
  "com.android.systemui": ["Système", "mdi:android"], "com.google.android.deskclock": ["Horloge", "mdi:alarm"], "com.sec.android.app.clockpackage": ["Horloge", "mdi:alarm"],
};
const SMS_APPS = ["com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms"];
/** Notifications du système : Android, constructeur (Xiaomi, Samsung, Nothing…), services Google. */
const SYSTEM_RE = [
  /^android$/, /^com\.android\.(?!mms|dialer|contacts|calendar|chrome|email|deskclock|camera)/,
  /^com\.(miui|xiaomi|mi)\./, /^com\.google\.android\.(gms|gsf|setupwizard|packageinstaller|permissioncontroller|networkstack|apps\.wellbeing|apps\.turbo|providers\.)/,
  /^com\.samsung\.android\.(?!messaging|dialer|calendar|email)/, /^com\.sec\.android\.(?!app\.clockpackage)/,
  /^com\.(oplus|coloros|oneplus|nothing|motorola|huawei|hihonor|realme|vivo|lge|sonymobile|asus)\./, /^com\.qualcomm\./,
];
const isSystem = (pkg) => !SMS_APPS.includes(pkg) && SYSTEM_RE.some((re) => re.test(pkg));
const SYSTEM_NAMES = [
  [/^android$|^com\.android\.systemui$/, "Système Android", "mdi:android"], [/^com\.android\.settings$/, "Paramètres", "mdi:cog"],
  [/^com\.android\.phone$|^com\.android\.server\.telecom$/, "Téléphonie", "mdi:phone"], [/^com\.android\.providers\.downloads/, "Téléchargements", "mdi:download"],
  [/^com\.miui\.securitycenter$/, "Sécurité", "mdi:shield-check"], [/^com\.(miui|xiaomi|mi)\./, "Xiaomi", "mdi:cellphone-cog"],
  [/^com\.google\.android\.(gms|gsf)/, "Services Google", "mdi:google"], [/^com\.google\.android\./, "Google", "mdi:google"],
  [/^com\.(samsung|sec)\.android\./, "Samsung", "mdi:cellphone-cog"], [/^com\.nothing\./, "Nothing", "mdi:cellphone-cog"],
  [/^com\.(oplus|coloros|oneplus|realme)\./, "OnePlus/Oppo", "mdi:cellphone-cog"],
];
const appInfo = (pkg) => APPS[pkg] || (() => { const m = SYSTEM_NAMES.find(([re]) => re.test(pkg)); return m ? [m[1], m[2]] : null; })()
  || [(pkg.split(".").pop() || pkg).replace(/^./, (c) => c.toUpperCase()), "mdi:bell-outline"];
const readNotifs = (st) => {
  const a = st?.attributes || {}, out = [];
  for (const k of Object.keys(a)) {
    if (!k.endsWith("_post_time")) continue;
    const pre = k.slice(0, -10);
    const title = a[`android.title_${pre}`] || a[`android.title.big_${pre}`] || "";
    const text = a[`android.text_${pre}`] || a[`android.bigText_${pre}`] || a[`android.big_text_${pre}`] || a[`android.title.big_${pre}`] || "";
    const pkg = pre.replace(/_+$/, "").split("_")[0];
    if (!ok(title) && !ok(text)) continue;
    out.push({ pkg, title: ok(title) ? String(title).trim() : "", text: ok(text) && text !== title ? String(text).trim() : "", t: parseInt(a[k], 10) || 0 });
  }
  return out.sort((x, y) => y.t - x.t);
};
const slug = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const tokens = (v) => slug(v).split("_").filter((t) => t.length > 1);
/** Volume de données : valeur et unité du capteur, en unités françaises (Go, Mo…). */
const UNITS_FR = { B: "o", KB: "ko", kB: "ko", MB: "Mo", GB: "Go", TB: "To", KiB: "Kio", MiB: "Mio", GiB: "Gio", TiB: "Tio" };
const fmtData = (st) => {
  if (!st || !ok(st.state)) return "—";
  const n = parseFloat(st.state), u = st.attributes?.unit_of_measurement || "Go";
  return Number.isFinite(n) ? `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 10 ? 2 : 1 })} ${UNITS_FR[u] || u}` : st.state;
};
const ago = (ms) => {
  if (!ms) return "";
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 24 * 60) return `il y a ${Math.floor(m / 60)} h`;
  return new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

/* ---------------------------------------------------------------- démo */
const DEMO = (() => {
  const t = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  return {
    person: { state: "not_home", name: "Camille" },
    battery: "64", charging: "on", charger_type: "wireless", network_type: "cellular", data_network: "5G", wifi_state: "off", wifi_ssid: "",
    hotspot: "off", bt_state: "on", bt_conn: "Écouteurs démo", sim: "Opérateur démo", activity: "walking", high_acc: "off",
    ringer: "vibrate", notif_count: "3", next_alarm: t(13.5), geocoded: "12 rue des Lilas, Villeneuve", rue: "12 rue des Lilas", ville: "Villeneuve",
    proximity: "2.4", public_ip: "203.0.113.42", last_reboot: t(-80), heart_rate: "78",
    vpn: "on", vpn_handshake: t(-0.03), vpn_rx: "1.24", vpn_tx: "0.38",
    notifs: [
      { pkg: "com.google.android.apps.messaging", title: "Dominique", text: "Je passe prendre le pain en rentrant, il te faut autre chose ?", t: Date.now() - 4 * 60e3 },
      { pkg: "com.whatsapp", title: "Famille démo", text: "Photo", t: Date.now() - 38 * 60e3 },
      { pkg: "io.homeassistant.companion.android", title: "Lave-linge", text: "Le cycle est terminé.", t: Date.now() - 2.5 * 3600e3 },
      { pkg: "android", title: "Point d'accès activé", text: "Aucun appareil connecté", t: Date.now() - 60e3 },
      { pkg: "com.miui.securitycenter", title: "Analyse terminée", text: "Aucune menace détectée.", t: Date.now() - 6 * 60e3 },
    ],
  };
})();

/* ------------------------------------------------------------- calculs */
const batLevel = (p) => !Number.isFinite(p) ? "" : p >= 50 ? "ok" : p >= 20 ? "warn" : "bad";
const LVL = { ok: "--med-down", warn: "--pc-warn", bad: "--t-red", "": "--med-muted" };
const batIcon = (p, chg) => {
  if (!Number.isFinite(p)) return "mdi:battery-unknown";
  const r = Math.max(0, Math.min(100, Math.round(p / 10) * 10));
  if (chg) return r >= 100 ? "mdi:battery-charging-100" : `mdi:battery-charging-${Math.max(10, r)}`;
  return r >= 100 ? "mdi:battery" : r <= 0 ? "mdi:battery-outline" : `mdi:battery-${r}`;
};
const dataColor = (raw) => {
  const r = String(raw || "").toUpperCase();
  if (/NR|5G/.test(r)) return "--pc-violet";
  if (/LTE|4G/.test(r)) return "--med-blue";
  if (/HSPA|H\+|3G|UMTS/.test(r)) return "--med-down";
  if (/EDGE|2G|GPRS|GSM/.test(r)) return "--pc-warn";
  return null;
};
const hrColor = (b) => b < 60 ? "--med-blue" : b <= 100 ? "--med-down" : b <= 140 ? "--pc-warn" : "--t-red";
/** Durée écoulée compacte pour « Ici depuis » : « 25 min », « 2 h 05 », « 3 j 4 h ». */
const since = (ms) => {
  if (!Number.isFinite(ms)) return "";
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
  const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60);
  return hh ? `${d} j ${hh} h` : `${d} j`;
};
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
    this._config = { ...c, theme: c.theme || "v2", title: c.title || "", phone: { ...(c.phone || {}) } };
    this._ents = null; this._fp = null; this._tab = 0;
    if (this._hass) this._render(true);
  }

  set hass(h) {
    this._hass = h;
    if (!this._config) return;
    const ents = this._entities();
    // temps de trajet (Waze, Google) : rafraîchis aussi quand ils changent
    const reg = h.entities || {}, tt = this._config.travel_times;
    const trips = Array.isArray(tt) ? tt.map((x) => (typeof x === "string" ? x : x?.entity)).filter(Boolean)
      : tt === false ? [] : Object.keys(h.states).filter((e) => e.startsWith("sensor.") && /^(waze_travel_time|google_travel_time)$/.test(reg[e]?.platform || ""));
    const fp = `${this._config.theme}|${h.themes?.darkMode}|` + (this._config.demo ? "demo" : [this._config.person, this._config.heart_rate, ...Object.values(ents), ...trips]
      .filter(Boolean).map((e) => { const s = h.states[e]; return s ? s.state + "|" + (s.attributes?.latitude ?? "") + (s.attributes?.entity_picture ?? "") + (e === ents.notif_count ? JSON.stringify(s.attributes) : "") : "x"; }).join(";"));
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
    // plusieurs appareils possibles (ancien téléphone, tablette…) : d'abord celui qui donne la position
    // actuelle de la personne (attribut « source »), puis les autres appareils de l'application compagnon
    const mobiles = trackers.filter((t) => reg[t]?.platform === "mobile_app");
    const src = person?.attributes?.source;
    const order = [...new Set([cfg.phone.tracker, trackers.includes(src) ? src : null, ...mobiles, ...trackers].filter(Boolean))];
    const tracker = order[0];
    if (tracker) out.tracker = tracker;
    const dev = tracker && reg[tracker]?.device_id;
    const sts = h?.states || {};
    const poolOf = (t) => {
      const d = reg[t]?.device_id;
      if (d) return Object.keys(reg).filter((e) => reg[e].device_id === d);
      const obj = t.split(".")[1];
      return Object.keys(sts).filter((e) => e.split(".")[1]?.startsWith(obj + "_"));
    };
    const pools = order.map(poolOf);
    // iPhone réinstallé ou renommé : le suivi (device_tracker.iphone_air) et les capteurs (sensor.iphone_…)
    // peuvent être sur deux appareils de l'application compagnon. Si aucun appareil de la personne n'a de
    // capteur de batterie, on prend l'appareil compagnon dont les capteurs commencent par le même nom,
    // seulement s'il est le seul à correspondre.
    if (tracker && !pools.flat().some((e) => /_battery_level$/.test(e))) {
      const parts = tracker.split(".")[1].split("_");
      for (let n = parts.length; n >= 1 && pools.length === order.length; n--) {
        const pre = parts.slice(0, n).join("_") + "_";
        const bat = Object.keys(reg).filter((e) => reg[e].platform === "mobile_app" && /^sensor\./.test(e) && e.slice(7).startsWith(pre) && /_battery_level$/.test(e));
        const devs = [...new Set(bat.map((e) => reg[e].device_id).filter(Boolean))];
        if (devs.length === 1) pools.push(Object.keys(reg).filter((e) => reg[e].device_id === devs[0]));
        else if (devs.length > 1) break; // plusieurs téléphones possibles : on ne devine pas
      }
    }
    const live = (e) => sts[e] && ok(sts[e].state);
    for (const [key, res] of Object.entries(this.constructor.KEYS || PHONE_KEYS)) {
      if (cfg.phone[key]) { out[key] = cfg.phone[key]; continue; }
      let first = null, hit = null;
      for (const pool of pools) {
        for (const re of res) {
          const found = pool.filter((e) => re.test(e) && /^(sensor|binary_sensor)\./.test(e));
          if (!first && found.length) first = found[0];
          hit = found.find(live);
          if (hit) break;
        }
        if (hit) break;
      }
      // une entité qui donne une valeur passe avant une entité indisponible d'un autre appareil
      if (hit || first) out[key] = hit || first;
    }
    // distance, rue et ville : calculées par la carte ; une entité indiquée sous « phone: » reste prioritaire
    for (const k of ["proximity", "rue", "ville"]) if (cfg.phone[k]) out[k] = cfg.phone[k];
    // VPN WireGuard (intégration wgdashboard_monitor) : le peer dont le nom correspond au téléphone ou à la personne
    const st = h?.states || {};
    let vpn = cfg.phone.vpn;
    if (!vpn) {
      const d = dev && h?.devices?.[dev];
      const names = [d?.name_by_user, d?.name, tracker?.split(".")[1], cfg.person?.split(".")[1], person?.attributes?.friendly_name].filter(Boolean).map(tokens).filter((t) => t.length);
      const sub = (a, b) => a.length && a.every((t) => b.includes(t));
      vpn = Object.keys(st).find((e) => {
        if (!/^binary_sensor\..+_connected$/.test(e) || !(reg[e]?.platform === "wgdashboard_monitor" || e.startsWith("binary_sensor.wgdashboard_"))) return false;
        const peer = tokens(e.slice(14, -10).replace(/^wgdashboard_[a-z0-9]+_/, ""));
        return names.some((n) => sub(peer, n) || sub(n, peer));
      });
    }
    if (vpn) {
      out.vpn = vpn;
      const base = vpn.replace(/^binary_sensor\./, "").replace(/_connected$/, "");
      for (const [k, sfx] of [["vpn_handshake", "last_handshake"], ["vpn_rx", "data_received"], ["vpn_tx", "data_sent"]]) if (st[`sensor.${base}_${sfx}`]) out[k] = `sensor.${base}_${sfx}`;
    }
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
    const parts = demo || !geo ? [] : String(geo).split(",").map((x) => x.trim()).filter(Boolean);
    const rue = this._v("rue") || (demo ? null : [attr(geoSt, "Sub Thoroughfare"), attr(geoSt, "Thoroughfare")].filter(Boolean).join(" ") || (parts.length > 1 ? parts[0] : null));
    const ville = this._v("ville") || (demo ? null : attr(geoSt, "Locality") || (parts.length > 1 ? parts[1].replace(/^\d{4,6}\s+/, "") : null));
    const where = geo || [rue, ville].filter(Boolean).join(", ");

    // distance : capteur proximity, sinon calculée entre le téléphone et la maison
    let km = parseFloat(this._v("proximity"));
    const proxSt = this._st("proximity");
    const unit = proxSt?.attributes?.unit_of_measurement;
    if (Number.isFinite(km)) km = unit === "m" ? km / 1000 : unit === "mi" ? km * 1.609344 : unit === "ft" ? km * 0.0003048 : km;
    if (Number.isFinite(km) && km < 0.05) km = 0;
    if (!Number.isFinite(km) && !demo && !home) {
      const src = this._st("tracker") || person;
      const la = parseFloat(src?.attributes?.latitude), lo = parseFloat(src?.attributes?.longitude);
      const hz = h.states["zone.home"]?.attributes;
      const hla = parseFloat(hz?.latitude ?? h.config?.latitude), hlo = parseFloat(hz?.longitude ?? h.config?.longitude);
      if ([la, lo, hla, hlo].every(Number.isFinite)) km = haversine(la, lo, hla, hlo);
      if (Number.isFinite(km) && km < 0.05) km = 0;
    }

    // batterie
    const batRaw = this._v("battery"), bat = parseFloat(batRaw);
    const bstate = String(this._v("battery_state") || "").toLowerCase();
    const charging = this._v("charging") === "on" || bstate === "charging" || bstate === "full";
    const ctype = String(this._v("charger_type") || "").toLowerCase();
    const charger = CHARGER[ctype] || (ok(ctype) && ctype !== "none" ? ctype : "");
    const bl = batLevel(bat);

    // réseau
    const ssidRaw = this._v("wifi_ssid");
    const ssid = ssidRaw && !/not connected/i.test(ssidRaw) ? ssidRaw : null;
    const wifiOn = this._v("wifi_state") === "on" || (this._v("wifi_state") == null && !!ssid);
    const net = String(this._v("network_type") || "").toLowerCase().replace(/[-\s]/g, "");
    const dn = this._v("data_network");
    const hotOn = this._v("hotspot") === "on";

    const E = this._entities();
    // clé simple ou « a|b » : la première entité disponible
    const pick = (k) => k.split("|").find((x) => demo ? DEMO[x] != null : !!E[x]);
    const has = (k) => !!pick(k);
    const ent = (k) => { const x = pick(k); return demo || !x ? "" : ` data-entity="${esc(E[x])}"`; };
    const col = (c) => c ? ` style="--c:var(${c})"` : "";
    /** Tuile : icône et libellé, valeur dessous ; « goto » ouvre l'onglet Notifications. */
    const tile = (k, label, icon, val, c, opts = "") => has(k)
      ? `<div class="pc-t${opts.includes("wide") ? " wide" : ""}"${opts.includes("goto") ? ` data-goto="notifs"` : ent(k)}${col(c)}><div class="pc-tt"><ha-icon icon="${esc(icon)}"></ha-icon>${esc(label)}</div><b>${esc(val ?? "—")}</b></div>`
      : "";
    const sec = (icon, title, body) => body.trim() ? `<div class="pc-sec">${title ? `<div class="pc-h"><ha-icon icon="${icon}"></ha-icon>${esc(title)}</div>` : ""}${body}</div>` : "";

    // onglet Téléphone
    const act = String(this._v("activity") || "").toLowerCase().trim();
    const [aIcon, aLbl] = ACTIVITY[act] || (ok(act) ? ["mdi:motion-sensor", act] : ACTIVITY.unknown);
    const hrSt = demo ? null : cfg.heart_rate && h.states[cfg.heart_rate];
    const hr = parseInt(demo ? DEMO.heart_rate : hrSt && ok(hrSt.state) ? hrSt.state : NaN, 10);
    const ring = String(this._v("ringer") || "").toLowerCase();
    const [rIcon, rLbl, rCol] = RINGER[ring] || ["mdi:bell-outline", ring || "—", null];
    const nc = parseInt(this._v("notif_count"), 10);
    const notifs = cfg.notifications === false ? [] : demo ? DEMO.notifs : readNotifs(this._st("notif_count"));
    const sms = notifs.find((n) => SMS_APPS.includes(n.pkg));
    const ncCol = !Number.isFinite(nc) ? null : nc > 10 ? "--t-red" : nc > 0 ? "--pc-warn" : "--med-down";
    const alarmIso = this._v("next_alarm");
    const alarmMs = alarmIso ? new Date(alarmIso) - Date.now() : NaN;
    const alarm = alarmIso ? fmtDate(alarmIso, true) || alarmIso : "Aucune";
    const vpnOn = this._v("vpn") === "on";
    const hsIso = this._v("vpn_handshake");
    const hsMs = hsIso ? Date.parse(hsIso) : NaN;
    const vData = (k) => demo ? (DEMO[k] ? `${String(DEMO[k]).replace(".", ",")} Go` : "—") : fmtData(this._st(k));
    const vpnTile = has("vpn") ? `<div class="pc-t wide"${ent("vpn")}${col(vpnOn ? "--med-down" : null)}><div class="pc-tt"><ha-icon icon="${vpnOn ? "mdi:vpn" : "mdi:lan-disconnect"}"></ha-icon>VPN WireGuard</div>
        <b>${vpnOn ? "Connecté" : this._v("vpn") ? "Déconnecté" : "—"}</b>
        <div class="pc-tn">${Number.isFinite(hsMs) ? `Handshake ${esc(ago(hsMs))}` : ""}${has("vpn_rx") || has("vpn_tx") ? `${Number.isFinite(hsMs) ? "<br>" : ""}↓ ${esc(vData("vpn_rx"))} · ↑ ${esc(vData("vpn_tx"))}` : ""}</div></div>` : "";

    const smsTile = sms ? `<div class="pc-t wide multi" data-goto="notifs"><div class="pc-tt"><ha-icon icon="mdi:message-text" style="color:var(--med-accent, var(--med-blue))"></ha-icon>Dernier SMS · ${esc(sms.title)} · ${esc(ago(sms.t))}</div><b>${esc(sms.text || sms.title)}</b></div>` : "";
    // valeur numérique d'un capteur avec son unité (pas, distance, pression…)
    // unité absente (certaines versions de l'application iOS) : celle que donne l'iPhone par défaut
    const UNIT = { walk_distance: "m", pressure: "hPa", storage: "%" };
    const num = (k, digits = 0) => {
      const v = parseFloat(this._v(k));
      if (!Number.isFinite(v)) return null;
      const u = String((demo ? "" : this._st(k)?.attributes?.unit_of_measurement) || UNIT[k] || "");
      if (u === "m" && v >= 1000) return `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
      // « % available » de l'application iOS (stockage) : en français
      const uf = /^%\s*available$/i.test(u) ? "% libre" : u;
      return `${v.toLocaleString("fr-FR", { maximumFractionDigits: digits })}${uf && uf !== "steps" && uf !== "floors" ? ` ${uf}` : ""}`;
    };
    const focusOn = this._v("focus") === "on";
    const focusName = this._v("focus_name");
    const p0 = sec("mdi:cellphone-information", "Téléphone", `<div class="pc-ts tk-g4">
        ${tile("focus", "Concentration", focusOn ? "mdi:moon-waning-crescent" : "mdi:bell-ring-outline", focusOn ? (focusName && !/^(none|aucun)$/i.test(focusName) ? focusName : "Activée") : "Désactivée", focusOn ? "--pc-violet" : null)}
        ${tile("ringer", "Sonnerie", rIcon, rLbl, rCol)}
        ${tile("next_alarm", "Prochaine alarme", "mdi:alarm", alarm, alarmMs > 0 && alarmMs < 3600e3 ? "--t-red" : alarmIso ? "--pc-warn" : null)}
        ${vpnTile}
        ${smsTile}
      </div>`.replace(/<div class="pc-ts tk-g4">\s*<\/div>/, ""))
      + sec("mdi:shoe-print", "Activité du jour", `<div class="pc-ts tk-g4">
        ${tile("steps", "Pas", "mdi:shoe-print", num("steps"), null)}
        ${tile("walk_distance", "Distance", "mdi:map-marker-path", num("walk_distance", 1), null)}
        ${tile("floors_up", "Étages montés", "mdi:stairs-up", num("floors_up"), null)}
        ${tile("pressure", "Pression", "mdi:gauge", num("pressure", 1), null)}
      </div>`.replace(/<div class="pc-ts tk-g4">\s*<\/div>/, ""))
      + (cfg.find_phone_script ? sec("", "", `<button class="pc-btn bad" id="find"><ha-icon icon="mdi:cellphone-sound"></ha-icon><span>Faire sonner le téléphone</span></button>`) : "");

    // onglet Réseau
    const btOn = this._v("bt_state") === "on", btc = String(this._v("bt_conn") || "").trim();
    const btNone = !btc || /none|null|unknown|disconnected|aucun/i.test(btc) || btc === "0";
    const sim = this._v("sim"), simOk = sim && !/absent|no service|none/i.test(sim);
    const gps = this._v("high_acc") === "on";
    const netTiles = [
      tile("wifi_ssid|wifi_state", "Wi-Fi", wifiOn ? "mdi:wifi" : "mdi:wifi-off", wifiOn ? ssid || "Activé" : "Désactivé", wifiOn ? "--med-down" : null),
      tile("data_network|network_type", "Réseau mobile", "mdi:signal", dn || (net === "wifi" ? "Wi-Fi" : net === "cellular" ? "Mobile" : net || "—"), dataColor(dn)),
      tile("bt_state", "Bluetooth", btOn ? "mdi:bluetooth" : "mdi:bluetooth-off", btOn ? (btNone ? "Activé" : btc) : "Désactivé", btOn ? (btNone ? "--med-blue" : "--med-down") : null),
      tile("sim", "Carte SIM", "mdi:sim", sim || "—", sim ? (simOk ? "--med-down" : "--t-red") : null),
      tile("high_acc", "GPS", gps ? "mdi:crosshairs-gps" : "mdi:crosshairs", gps ? "Haute précision" : "Standard", gps ? "--pc-violet" : null),
      tile("hotspot", "Partage de connexion", hotOn ? "mdi:access-point" : "mdi:access-point-off", hotOn ? "Activé" : "Désactivé", hotOn ? "--pc-warn" : null),
    ].join("");
    const placeTiles = [
      rue ? `<div class="pc-t"${ent(E.rue ? "rue" : "geocoded")}><div class="pc-tt"><ha-icon icon="mdi:road-variant"></ha-icon>Rue</div><b>${esc(rue)}</b></div>` : "",
      ville ? `<div class="pc-t"${ent(E.ville ? "ville" : "geocoded")}><div class="pc-tt"><ha-icon icon="mdi:city-variant-outline"></ha-icon>Ville</div><b>${esc(ville)}</b></div>` : "",
    ].join("");
    const p1 = sec("mdi:access-point-network", "Connexions", netTiles ? `<div class="pc-ts">${netTiles}</div>` : "")
      + sec("mdi:map-marker-outline", "Position", placeTiles ? `<div class="pc-ts">${placeTiles}</div>` : "");

    // onglet Infos
    const rb = this._v("last_reboot");
    const infoTiles = [
      tile("public_ip", "IP publique", "mdi:web", this._v("public_ip"), null, "wide"),
      tile("last_reboot", "Dernier redémarrage", "mdi:restart", rb ? fmtDate(rb, true) || rb : null, null, "wide"),
      tile("storage", "Stockage", "mdi:harddisk", num("storage", 0), null),
      tile("app_version", "Application compagnon", "mdi:cellphone-arrow-down", this._v("app_version"), null),
      tile("geocoded", "Adresse", "mdi:map-marker-outline", geo, null, "wide"),
    ].join("");
    const p2 = this._extras(this._st("tracker") || person) + sec("mdi:information-outline", "Appareil", infoTiles ? `<div class="pc-ts">${infoTiles}</div>` : "");

    // onglet Notifications
    // applications d'un côté, système (Android, constructeur, services Google) de l'autre
    const max = cfg.notifications_max || 20;
    const nItem = (n) => { const [app, icon] = appInfo(n.pkg); return `
      <div class="tk-n"><ha-icon icon="${esc(icon)}"></ha-icon><div><div class="tk-nh"><span>${esc(app)}</span><span>${esc(ago(n.t))}</span></div>
        ${n.title ? `<b>${esc(n.title)}</b>` : ""}${n.text ? `<p>${esc(n.text)}</p>` : ""}</div></div>`; };
    const nList = (list) => `<div class="tk-nl">${list.slice(0, max).map(nItem).join("")}</div>`;
    const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
    const appN = notifs.filter((n) => !isSystem(n.pkg)), sysN = cfg.system_notifications === false ? [] : notifs.filter((n) => isSystem(n.pkg));
    const p3 = (appN.length ? sec("mdi:bell-outline", `Applications · ${plural(appN.length, "notification")}`, nList(appN)) : "")
      + (sysN.length ? sec("mdi:cellphone-cog", `Système · ${plural(sysN.length, "notification")}`, nList(sysN)) : "");

    const panels = [["mdi:cellphone", "Téléphone", p0], ["mdi:wifi", "Réseau", p1], ["mdi:bell-outline", "Notifications", p3, "notifs"], ["mdi:information-outline", "Infos", p2]]
      .filter(([, , p]) => p.trim());
    this._panelIds = panels.map((x) => x[3] || "");
    if (this._tab >= panels.length) this._tab = 0;

    // en-tête « profil » : photo dans l'anneau de batterie, zone, adresse, activité et distance
    // anneau de présence : vert à la maison, orange jusqu'à near_radius km (5 par défaut), rouge au-delà
    const radius = Number(cfg.near_radius) > 0 ? Number(cfg.near_radius) : 5;
    const pres = !pstate || !ok(pstate) ? "" : home ? "home" : Number.isFinite(km) ? (km <= radius ? "near" : "far") : "away";
    const presTip = { home: "À la maison", near: `À moins de ${radius} km de la maison`, far: `À plus de ${radius} km de la maison`, away: "Pas à la maison" }[pres] || "Présence inconnue";
    const meta = [
      // activité inconnue (iPhone sans mouvement détecté) : rien plutôt que « Inconnue »
      has("activity") && act !== "unknown" && ok(act) ? `<span><ha-icon icon="${esc(aIcon)}"></ha-icon>${esc(aLbl)}</span>` : "",
      Number.isFinite(km) ? `<span><ha-icon icon="mdi:map-marker-distance"></ha-icon>${esc(fmtKm(km))}</span>` : "",
      demo ? "" : this._sinceSpan(person, pstate),
      Number.isFinite(hr) ? `<span style="color:var(${hrColor(hr)})"><ha-icon class="tk-hr" icon="mdi:heart-pulse"></ha-icon>${hr} bpm</span>` : "",
      charging ? `<span style="color:var(--pc-warn)"><ha-icon icon="mdi:flash" style="color:var(--pc-warn)"></ha-icon>${esc(charger || "En charge")}</span>` : "",
    ].join("");
    // pastilles rondes : Wi-Fi, réseau mobile, Bluetooth, VPN, notifications, alarme
    const dial = (k, label, inner, c, state, extra = "", tip = label) => `<div class="tk-dial ${state}"${extra || ent(k)}${col(c)} title="${esc(tip)}"><div>${inner}</div><span>${esc(label)}</span></div>`;
    const icon = (i) => `<ha-icon icon="${i}"></ha-icon>`;
    const alarmHm = alarmIso ? fmtDate(alarmIso, false) : null;
    const dials = [
      has("battery") ? dial("battery", "Batterie", `${Number.isFinite(bat) ? Math.round(bat) : "—"}${charging ? `<ha-icon icon="mdi:flash" style="--mdc-icon-size:14px;margin-left:-1px"></ha-icon>` : `<small style="font-size:.62rem">%</small>`}`,
        LVL[bl], "on", "", `Batterie ${Number.isFinite(bat) ? Math.round(bat) + " %" : ""}${charging ? ` · en charge${charger ? ` (${charger})` : ""}` : ""}`) : "",
      has("wifi_state") || has("wifi_ssid") ? dial(has("wifi_ssid") ? "wifi_ssid" : "wifi_state", "Wi-Fi", icon(wifiOn ? "mdi:wifi" : "mdi:wifi-off"), wifiOn ? "--med-down" : null, wifiOn ? "on" : "off", "", wifiOn ? `Wi-Fi : ${ssid || "connecté"}` : "Wi-Fi désactivé") : "",
      has("data_network") || net === "cellular" ? dial(has("data_network") ? "data_network" : "network_type", "Mobile", dn ? esc(String(dn).replace(/^NR$/i, "5G").slice(0, 4)) : icon("mdi:signal"), dataColor(dn) || "--med-blue", "on") : "",
      has("bt_state") ? dial("bt_state", "Bluetooth", icon(btOn ? "mdi:bluetooth" : "mdi:bluetooth-off"), btOn ? "--med-blue" : null, btOn ? "on" : "off", "", btOn ? (btNone ? "Bluetooth activé" : `Bluetooth : ${btc}`) : "Bluetooth désactivé") : "",
      has("vpn") ? dial("vpn", "VPN", icon(vpnOn ? "mdi:vpn" : "mdi:lan-disconnect"), vpnOn ? "--pc-violet" : null, vpnOn ? "on" : "off") : "",
      hotOn ? dial("hotspot", "Partage", icon("mdi:access-point"), "--pc-warn", "on") : "",
      has("notif_count") ? dial("notif_count", "Notifs", Number.isFinite(nc) ? String(nc) : icon("mdi:bell-off-outline"), ncCol, Number.isFinite(nc) && nc > 0 ? "on" : "off", notifs.length ? ` data-goto="notifs"` : "") : "",
      has("next_alarm") ? dial("next_alarm", "Alarme", alarmHm ? `<small style="font-size:.74rem">${esc(alarmHm)}</small>` : icon("mdi:alarm-off"), alarmIso ? (alarmMs > 0 && alarmMs < 3600e3 ? "--t-red" : "--pc-warn") : null, alarmIso ? "on" : "off") : "",
    ].join("");

    const html = `
      <div class="tk-hero ${pres}">
        ${cfg.title || demo ? `<div class="tk-top">${esc(cfg.title || "")}${demo ? "<small>Démo</small>" : ""}</div>` : ""}
        <div class="tk-ring"${demo || !cfg.person ? "" : ` data-entity="${esc(cfg.person)}"`} title="${esc(presTip)}">
          <svg viewBox="0 0 92 92"><circle class="bg" cx="46" cy="46" r="42"></circle>${pres ? `<circle class="fg" cx="46" cy="46" r="42"></circle>` : ""}</svg>
          <div class="tk-face">${pic ? `<img src="${esc(pic)}" alt="">` : esc((name || "?").trim().charAt(0).toUpperCase())}</div>
        </div>
        <div class="tk-id">
          <div class="tk-name">${esc(name)}</div>
          <div class="tk-zone"${demo || !cfg.person ? "" : ` data-entity="${esc(cfg.person)}"`}><i></i>${esc((zone || (cfg.person ? "Inconnu" : "Choisissez une personne")) + this._nearTxt(pstate, demo ? null : this._st("tracker") || person))}</div>
          ${where ? `<div class="tk-addr">${esc(where)}</div>` : ""}
          ${meta ? `<div class="tk-meta">${meta}</div>` : ""}
        </div>
      </div>
      ${dials ? `<div class="tk-dials">${dials}</div>` : ""}
      ${panels.length > 1 ? `<div class="pc-tabs">${panels.map(([i, l], n) => `<button class="pc-tab${n === this._tab ? " on" : ""}" data-tab="${n}"><ha-icon icon="${i}"></ha-icon>${l}${panels[n][3] === "notifs" ? ` <small>${appN.length + sysN.length}</small>` : ""}</button>`).join("")}</div>` : ""}
      ${panels.map(([, , p], n) => `<div class="panel${n === this._tab ? " on" : ""}">${p}</div>`).join("")}
      ${!panels.length && !demo && !Number.isFinite(bat) && !has("activity") ? `<div class="empty">${cfg.person ? "<b>Aucun capteur de téléphone trouvé</b><span>Indiquez-les dans l'éditeur de la carte (section Téléphone).</span>" : "<b>Choisissez une personne</b><span>dans l'éditeur de la carte.</span>"}</div>` : ""}`;

    if (full || !this._card) {
      this.shadowRoot.innerHTML = `${STYLE}<ha-card></ha-card>`;
      this._card = this.shadowRoot.querySelector("ha-card");
      this._card.addEventListener("click", (ev) => this._click(ev));
    }
    this._card.className = themeClass(cfg.theme, h);
    this._card.innerHTML = html;
  }

  _click(ev) {
    const tab = ev.target.closest(".pc-tab");
    if (tab) {
      this._tab = +tab.dataset.tab;
      this._card.querySelectorAll(".pc-tab").forEach((t) => t.classList.toggle("on", t === tab));
      this._card.querySelectorAll(".panel").forEach((p, n) => p.classList.toggle("on", n === this._tab));
      return;
    }
    if (ev.target.closest("#find")) return this._find(ev.target.closest("#find"));
    const go = ev.target.closest("[data-goto]");
    if (go) { const n = (this._panelIds || []).indexOf(go.dataset.goto); const t = n >= 0 && this._card.querySelector(`.pc-tab[data-tab="${n}"]`); if (t) t.click(); return; }
    const el = ev.target.closest("[data-entity]");
    if (el) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.entity }, bubbles: true, composed: true }));
  }

  /** Lieu proche quand la personne n'est dans aucune zone : à moins de approach_distance m (150 par défaut) du bord d'une zone.
   *  « En approche de » si la distance baisse depuis le dernier affichage, sinon « Près de ». */
  _nearPlace(pstate, src) {
    const cfg = this._config, st = this._hass?.states || {};
    const lim = cfg.approach_distance === undefined ? 150 : Number(cfg.approach_distance);
    if (cfg.demo || !(lim > 0) || pstate !== "not_home") return null;
    const la = parseFloat(src?.attributes?.latitude), lo = parseFloat(src?.attributes?.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    let best = null;
    for (const [id, z] of Object.entries(st)) {
      if (!id.startsWith("zone.") || z.attributes?.passive) continue;
      const zl = parseFloat(z.attributes?.latitude), zo = parseFloat(z.attributes?.longitude);
      if (!Number.isFinite(zl) || !Number.isFinite(zo)) continue;
      const edge = haversine(la, lo, zl, zo) * 1000 - (parseFloat(z.attributes?.radius) || 100);
      if (edge <= lim && (!best || edge < best.edge)) best = { id, edge, name: id === "zone.home" ? "la maison" : z.attributes?.friendly_name || id };
    }
    this._edges ||= {};
    if (!best) { this._edges = {}; return null; }
    const prev = this._edges[best.id];
    this._edges = { [best.id]: best.edge };
    return { ...best, approaching: Number.isFinite(prev) && best.edge < prev - 5 };
  }

  /** Texte ajouté à la zone de l'en-tête : « · En approche de Travail » ou « · Près de la maison ». */
  _nearTxt(pstate, src) {
    const n = this._nearPlace(pstate, src);
    return n ? ` · ${n.approaching ? "En approche de" : "Près de"} ${n.name}` : "";
  }

  /** « Ici depuis 2 h 05 » (dans une zone) ou « Parti depuis 25 min » (hors zone), d'après le changement d'état de la personne. */
  _sinceSpan(person, pstate) {
    if (this._config.show_since === false || !person?.last_changed || !pstate || !ok(pstate)) return "";
    const d = since(Date.parse(person.last_changed));
    return d ? `<span title="Depuis le dernier changement de lieu"><ha-icon icon="mdi:timer-sand"></ha-icon>${pstate === "not_home" ? "Parti depuis" : "Ici depuis"} ${esc(d)}</span>` : "";
  }

  /** Distances aux lieux (zones ou capteurs de distance, option places) et temps de trajet (Waze, option travel_times). */
  _extras(src) {
    const cfg = this._config, h = this._hass;
    if (cfg.demo) return this._extrasDemo();
    const st = h.states, reg = h.entities || {};
    const la = parseFloat(src?.attributes?.latitude), lo = parseFloat(src?.attributes?.longitude);
    const hasPos = Number.isFinite(la) && Number.isFinite(lo);
    const t = (id, label, icon, val, c, note) => `<div class="pc-t"${id ? ` data-entity="${esc(id)}"` : ""}${c ? ` style="--c:var(${c})"` : ""}><div class="pc-tt"><ha-icon icon="${esc(icon)}"></ha-icon>${esc(label)}</div><b>${esc(val)}</b>${note ? `<div class="pc-tn">${esc(note)}</div>` : ""}</div>`;
    const box = (icon, title, tiles) => tiles ? `<div class="pc-sec"><div class="pc-h"><ha-icon icon="${icon}"></ha-icon>${esc(title)}</div><div class="pc-ts">${tiles}</div></div>` : "";
    // lieux : ceux de l'option places, sinon toutes les zones (sauf Maison, déjà dans l'en-tête)
    let places = cfg.places;
    const auto = !Array.isArray(places);
    // à la maison : section Lieux masquée avec places_at_home: false
    const atHome = h.states[cfg.person]?.state === "home";
    if (places === false || (atHome && cfg.places_at_home === false)) places = [];
    else if (auto) places = Object.keys(st).filter((e) => e.startsWith("zone.") && e !== "zone.home");
    const kmOf = (s) => {
      const v = parseFloat(s?.state), u = s?.attributes?.unit_of_measurement;
      return !Number.isFinite(v) ? NaN : u === "m" ? v / 1000 : u === "mi" ? v * 1.609344 : u === "ft" ? v * 0.0003048 : v;
    };
    const rows = places.map((p) => (typeof p === "string" ? { entity: p } : p || {})).filter((p) => p.entity && st[p.entity]).map((p) => {
      const s = st[p.entity], zone = p.entity.startsWith("zone.");
      let km = NaN, inside = false;
      if (zone) {
        const zl = parseFloat(s.attributes?.latitude), zo = parseFloat(s.attributes?.longitude);
        if (hasPos && Number.isFinite(zl) && Number.isFinite(zo)) {
          km = haversine(la, lo, zl, zo);
          inside = km * 1000 <= (parseFloat(s.attributes?.radius) || 100);
        }
      } else km = kmOf(s);
      return { ...p, s, km, inside, name: p.name || s.attributes?.friendly_name || p.entity, icon: p.icon || s.attributes?.icon || (zone ? "mdi:map-marker-radius" : "mdi:map-marker-distance") };
    })
      // zone où se trouve la personne : déjà dans l'en-tête, masquée (places_hide_current: false pour la garder)
      .filter((p) => Number.isFinite(p.km) && !(p.inside && cfg.places_hide_current !== false))
      // ordre : celui de la liste places ; par distance pour les zones trouvées seules ou avec places_sort: distance
      .sort((a, b) => (auto || cfg.places_sort === "distance" ? a.km - b.km : 0)).slice(0, Number(cfg.places_max) || 8);
    const pl = rows.map((p) => t(p.entity, p.name, p.icon, p.inside ? "Sur place" : fmtKm(p.km), p.inside ? "--med-down" : null)).join("");
    // temps de trajet : capteurs de l'option travel_times, sinon ceux de Waze et Google trouvés
    let trips = cfg.travel_times;
    if (trips === false) trips = [];
    else if (!Array.isArray(trips)) trips = Object.keys(st).filter((e) => e.startsWith("sensor.") && /^(waze_travel_time|google_travel_time)$/.test(reg[e]?.platform || "")).slice(0, 6);
    const tr = trips.map((p) => (typeof p === "string" ? { entity: p } : p || {})).filter((p) => p.entity && st[p.entity]).map((p) => {
      const s = st[p.entity], a = s.attributes || {}, min = parseFloat(s.state);
      if (!Number.isFinite(min)) return "";
      const m = Math.round(min), dur = m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
      const dist = parseFloat(a.distance);
      const note = [Number.isFinite(dist) ? `${dist.toLocaleString("fr-FR", { maximumFractionDigits: dist < 10 ? 1 : 0 })} km` : "", a.route ? `via ${a.route}` : ""].filter(Boolean).join(" · ");
      // retard : au-delà du trajet habituel indiqué (option usual, en minutes)
      const c = Number(p.usual) > 0 ? (m > p.usual * 1.25 ? "--t-red" : m > p.usual * 1.1 ? "--pc-warn" : "--med-down") : null;
      return t(p.entity, p.name || a.friendly_name || p.entity, p.icon || "mdi:car-clock", dur, c, note);
    }).join("");
    return box("mdi:map-marker-multiple-outline", "Lieux", pl) + box("mdi:car-clock", "Temps de trajet", tr);
  }

  _extrasDemo() {
    const t = (label, icon, val, c, note) => `<div class="pc-t"${c ? ` style="--c:var(${c})"` : ""}><div class="pc-tt"><ha-icon icon="${icon}"></ha-icon>${label}</div><b>${val}</b>${note ? `<div class="pc-tn">${note}</div>` : ""}</div>`;
    return `<div class="pc-sec"><div class="pc-h"><ha-icon icon="mdi:map-marker-multiple-outline"></ha-icon>Lieux</div><div class="pc-ts">${t("Travail", "mdi:briefcase", "Sur place", "--med-down")}${t("Salle de sport", "mdi:dumbbell", "3,2 km")}${t("École", "mdi:school", "6,8 km")}</div></div>`
      + `<div class="pc-sec"><div class="pc-h"><ha-icon icon="mdi:car-clock"></ha-icon>Temps de trajet</div><div class="pc-ts">${t("Travail → Maison", "mdi:car-clock", "28 min", "--pc-warn", "21 km · via A1")}${t("Maison → Travail", "mdi:car-clock", "22 min", "--med-down", "21 km · via D1001")}</div></div>`;
  }

  async _find(btn) {
    const id = this._config.find_phone_script;
    if (!id || this._config.demo) return;
    btn.classList.add("armed");
    try {
      const [dom] = id.split(".");
      if (dom === "button" || dom === "input_button") await this._hass.callService(dom, "press", { entity_id: id });
      else {
        // un seul script pour plusieurs téléphones : find_phone_data est passé au script (variables)
        const data = this._config.find_phone_data;
        await this._hass.callService("script", "turn_on", data && typeof data === "object" ? { entity_id: id, variables: data } : { entity_id: id });
      }
    } catch (e) {
      console.error("[tracker-card] impossible de lancer", id, e);
    }
    setTimeout(() => btn.classList.remove("armed"), 3000);
  }
}

/* ============================================================== éditeur */
// même éditeur que les autres cartes : formulaire Home Assistant (ha-form)
const ent = (domain) => ({ entity: { domain } });
/** Champ places de l'éditeur : liste d'entités à choisir (dans l'ordre voulu), ou YAML s'il contient des noms ou icônes. */
const placesSchema = (schema, cfg) => {
  const simple = cfg.places === undefined || (Array.isArray(cfg.places) && cfg.places.every((p) => typeof p === "string"));
  return schema.map((f) => f.name === "places" && simple ? { name: "places", selector: { entity: { multiple: true, domain: ["zone", "sensor"] } } } : f);
};
const PLACE_FIELDS = [
  { name: "places_hide_current", selector: { boolean: {} } },
  { name: "places_at_home", selector: { boolean: {} } },
  { name: "places_sort", selector: { select: { mode: "dropdown", options: [{ value: "list", label: "Dans l'ordre de la liste" }, { value: "distance", label: "Du plus proche au plus loin" }] } } },
  { name: "places_max", selector: { number: { min: 1, max: 30, mode: "box" } } },
  { name: "approach_distance", selector: { number: { min: 0, max: 2000, step: 10, mode: "box", unit_of_measurement: "m" } } },
  { name: "show_since", selector: { boolean: {} } },
];
const PLACE_LABELS = {
  places_hide_current: "Lieux : masquer la zone où se trouve la personne (déjà dans l'en-tête)",
  places_at_home: "Lieux : afficher la section quand la personne est à la maison",
  places_sort: "Lieux : ordre d'affichage (les zones trouvées seules sont toujours triées par distance)",
  places_max: "Lieux : nombre affiché au plus",
  approach_distance: "« Près de » / « En approche de » un lieu : distance au bord de la zone (0 = désactivé)",
  show_since: "Afficher « Ici depuis » dans l'en-tête",
};
const PLACE_DEFAULTS = { places_hide_current: true, places_at_home: true, places_sort: "list", places_max: 8, approach_distance: 150, show_since: true };
const SCHEMA = [
  { name: "person", selector: ent("person") },
  { name: "title", selector: { text: {} } },
  { name: "name", selector: { text: {} } },
  { name: "picture", selector: { text: {} } },
  { name: "find_phone_script", selector: { entity: { domain: ["script", "button", "input_button"] } } },
  { name: "find_phone_data", selector: { object: {} } },
  { name: "places", selector: { object: {} } },
  ...PLACE_FIELDS,
  { name: "travel_times", selector: { object: {} } },
  { name: "heart_rate", selector: ent("sensor") },
  { name: "near_radius", selector: { number: { min: 0.5, max: 100, step: 0.5, mode: "box", unit_of_measurement: "km" } } },
  { name: "notifications", selector: { boolean: {} } },
  { name: "system_notifications", selector: { boolean: {} } },
  { name: "notifications_max", selector: { number: { min: 1, max: 50, mode: "box" } } },
  { name: "theme", selector: { select: { mode: "dropdown", options: THEMES.map(([value, label]) => ({ value, label })) } } },
  { name: "demo", selector: { boolean: {} } },
  ...PHONE_GROUPS.map(([title, fields]) => ({
    type: "expandable", name: "phone", title: `Téléphone : ${title.toLowerCase()}`,
    schema: fields.map(([key, , domain]) => ({ name: key, selector: ent(domain) })),
  })),
];
const LABELS = {
  person: "Personne",
  title: "Titre (vide = nom de la personne)",
  name: "Nom affiché (vide = celui de la personne)",
  picture: "Photo, adresse d'une image (vide = celle de la personne)",
  find_phone_script: "Bouton « Faire sonner le téléphone » : script ou bouton",
  find_phone_data: "Données passées au script (par exemple { device: mobile_app_pixel }), pour un seul script commun à plusieurs téléphones",
  places: "Lieux (onglet Infos) : zones ou capteurs de distance, dans l'ordre voulu ; vide = toutes les zones",
  ...PLACE_LABELS,
  travel_times: "Temps de trajet (onglet Infos) : capteurs Waze ou Google ; vide = ceux trouvés, false = aucun",
  heart_rate: "Fréquence cardiaque (montre)",
  near_radius: "Rayon « près de la maison » : anneau orange jusqu'à cette distance, rouge au-delà",
  notifications: "Afficher le contenu des notifications et le dernier SMS",
  system_notifications: "Afficher aussi les notifications du système (Android, constructeur, services Google)",
  notifications_max: "Nombre de notifications listées au plus, par section",
  theme: "Couleurs de la carte",
  demo: "Mode démo : personne et téléphone fictifs, pour les captures d'écran",
  ...Object.fromEntries(PHONE_GROUPS.flatMap(([, f]) => f.map(([k, l]) => [k, l]))),
};
const DEFAULTS = { title: "", theme: "v2", near_radius: 5, notifications: true, system_notifications: true, notifications_max: 20, demo: false, ...PLACE_DEFAULTS };

class TrackerCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._draw(); }
  set hass(hass) { this._hass = hass; if (this._form) { this._form.hass = hass; this._auto(); } else this._draw(); }
  /** Entités trouvées automatiquement : affichées sous chaque champ vide de la section Téléphone. */
  _auto() {
    try { const probe = document.createElement("tracker-card"); probe.setConfig({ ...this._config, phone: {} }); probe._hass = this._hass; this._found = probe._entities(); } catch (e) { this._found = {}; }
  }
  _draw() {
    if (!this._hass || !this._config) return;
    this._auto();
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => s.title || LABELS[s.name] || s.name;
      this._form.computeHelper = (s) => {
        if (!PHONE_KEYS[s.name] && !["tracker", "proximity", "rue", "ville", "vpn"].includes(s.name)) {
          return s.name === "person" ? "Les capteurs du téléphone de cette personne sont trouvés automatiquement." : undefined;
        }
        if (this._config.phone?.[s.name]) return undefined;
        if (this._found?.[s.name]) return `Trouvée automatiquement : ${this._found[s.name]}`;
        return s.name === "proximity" ? "Vide : distance calculée par la carte d'après le GPS du téléphone"
          : s.name === "rue" || s.name === "ville" ? "Vide : lue dans l'adresse géocodée" : undefined;
      };
      this._form.addEventListener("value-changed", (ev) => {
        const cfg = { ...ev.detail.value };
        // ne garder que ce qui diffère des valeurs par défaut, et seulement les entités du téléphone remplies
        for (const [k, v] of Object.entries(DEFAULTS)) if (cfg[k] === v || cfg[k] === undefined) delete cfg[k];
        for (const k of ["name", "picture", "find_phone_script", "find_phone_data", "heart_rate", "places", "travel_times"]) if (cfg[k] === "" || cfg[k] == null || (typeof cfg[k] === "object" && !Array.isArray(cfg[k]) && !Object.keys(cfg[k]).length)) delete cfg[k];
        if (Array.isArray(cfg.places) && !cfg.places.length) delete cfg.places; // liste vide = toutes les zones
        const phone = Object.fromEntries(Object.entries(cfg.phone || {}).filter(([, v]) => v));
        if (Object.keys(phone).length) cfg.phone = phone; else delete cfg.phone;
        this._config = cfg;
        this._auto();
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = placesSchema(SCHEMA, this._config);
    this._form.data = { ...DEFAULTS, ...this._config, phone: { ...(this._config.phone || {}) } };
  }
}

/* =========================================================== carte iPhone */
// Même modèle que la carte Présence et téléphone, pour l'application compagnon iOS : tous les capteurs
// qu'elle peut envoyer (documentation companion.home-assistant.io), Apple Santé, Apple Watch, kiosque et caméra.
const IOS_KEYS = {
  battery: [/(?<!watch)_battery_level$/],
  battery_state: [/(?<!watch)_battery_state$/],
  watch_battery: [/_watch_battery_level$/],
  watch_battery_state: [/_watch_battery_state$/],
  activity: [/_activity$/],
  focus: [/_focus$/],
  steps: [/(?<!health)_steps$/],
  walk_distance: [/(?<!running)_distance$/],
  floors_up: [/_floors_ascended$/],
  floors_down: [/_floors_descended$/],
  pace: [/_average_active_pace$/],
  pressure: [/(?<!blood)_pressure$/],
  connection: [/_connection_type$/],
  ssid: [/_ssid$/],
  bssid: [/_bssid$/],
  sim1: [/_sim_1$/],
  sim2: [/_sim_2$/],
  geocoded: [/_geocoded_location$/],
  storage: [/_storage$/],
  app_version: [/_app_version$/],
  last_update: [/_last_update_trigger$/],
  location_perm: [/_location_permission$/],
  kiosk_mode: [/_kiosk_mode$/],
  kiosk_screensaver: [/_kiosk_screensaver$/],
  kiosk_brightness: [/_kiosk_brightness$/],
  kiosk_volume: [/_kiosk_volume$/],
  camera_motion: [/_camera_motion$/],
  camera_stream: [/_camera_stream$/],
  // Apple Santé (désactivés par défaut dans l'application, un par un)
  h_steps: [/_health_steps$/],
  h_distance: [/_walking_running_distance$/],
  active_energy: [/_active_energy$/],
  resting_energy: [/_resting_energy$/],
  flights: [/_flights_climbed$/],
  exercise_time: [/_exercise_time$/],
  vo2_max: [/_vo2_max$/],
  move_goal: [/_move_goal$/],
  exercise_goal: [/_exercise_goal$/],
  stand_hours: [/_stand_hours$/],
  stand_goal: [/_stand_goal$/],
  weight: [/_weight$/],
  body_fat: [/_body_fat_percentage$/],
  lean_mass: [/_lean_body_mass$/],
  height: [/_height$/],
  heart: [/(?<!resting|walking)_heart_rate$/],
  heart_rest: [/_resting_heart_rate$/],
  heart_walk: [/_walking_heart_rate_average$/],
  hrv: [/_heart_rate_variability$/],
  bp_sys: [/_blood_pressure_systolic$/],
  bp_dia: [/_blood_pressure_diastolic$/],
  water: [/_water$/],
  resp_rate: [/_respiratory_rate$/],
  spo2: [/_blood_oxygen$/],
  sleep: [/_sleep_duration$/],
  in_bed: [/_in_bed$/],
  awake: [/_awake$/],
  sleep_core: [/_core_sleep$/],
  sleep_deep: [/_deep_sleep$/],
  sleep_rem: [/_rem_sleep$/],
  body_temp: [/(?<!basal)_body_temperature$/],
  basal_temp: [/_basal_body_temperature$/],
  glucose: [/_blood_glucose$/],
};
const IOS_STATE = {
  charging: "En charge", "not charging": "Pas en charge", full: "Pleine",
  "wi-fi": "Wi-Fi", cellular: "Mobile", "no connection": "Aucune connexion", "not connected": "Non connecté", "unknown technology": "Technologie inconnue",
  always: "Toujours", "when in use": "Pendant l'utilisation", "authorized when in use": "Pendant l'utilisation", "authorized always": "Toujours",
  never: "Jamais", denied: "Refusée", restricted: "Restreinte", "not determined": "Pas encore choisie",
  manual: "Manuelle", launch: "Ouverture de l'application", periodic: "Périodique", "significant location change": "Changement de position important",
  "geographic region entered": "Entrée dans une zone", "geographic region exited": "Sortie d'une zone", "push notification": "Notification push",
  "background fetch": "En arrière-plan", siri: "Siri", "ibeacon region entered": "Balise iBeacon", registration: "Enregistrement", signaled: "Signal de l'application",
  streaming: "Diffusion en cours", idle: "En attente", on: "Activé", off: "Désactivé",
};
const iosFr = (v) => (v == null ? null : IOS_STATE[String(v).toLowerCase().trim()] || String(v));
/** Technologie radio iOS (CTRadioAccessTechnologyNR, LTE…) en 5G, 4G, 3G, 2G. */
const radioFr = (v) => {
  const r = String(v || "").replace(/^CTRadioAccessTechnology/i, "");
  return /NR/i.test(r) ? "5G" : /LTE/i.test(r) ? "4G" : /WCDMA|HSDPA|HSUPA|CDMAEVDO|eHRPD/i.test(r) ? "3G" : /GPRS|Edge|CDMA1x/i.test(r) ? "2G" : r || null;
};
const IOS_DEMO = {
  battery: "64", battery_state: "Not Charging", watch_battery: "82", watch_battery_state: "Charging", activity: "Walking", focus: "on",
  steps: "6420", walk_distance: "4630", floors_up: "7", floors_down: "5", pace: "1.32", pressure: "1013.4", connection: "Cellular", ssid: "Not Connected",
  bssid: "Not Connected", sim1: "Opérateur démo", sim2: "Opérateur eSIM", geocoded: "12 rue des Lilas, Villeneuve", storage: "62", app_version: "2026.10.3",
  last_update: "Significant Location Change", location_perm: "Always", kiosk_mode: "off", camera_motion: "off", camera_stream: "idle",
  heart: "74", heart_rest: "58", hrv: "46", spo2: "98", resp_rate: "15", sleep: "7.3", sleep_deep: "1.2", sleep_rem: "1.6", sleep_core: "4.1", awake: "0.4",
  active_energy: "420", exercise_time: "34", stand_hours: "9", move_goal: "500", exercise_goal: "30", stand_goal: "12", water: "1.4",
};

class TrackerIphoneCard extends TrackerCard {
  static get KEYS() { return IOS_KEYS; }
  static getConfigElement() { return document.createElement("tracker-iphone-card-editor"); }
  getCardSize() { return 8; }

  _v(key) {
    if (this._config.demo) return IOS_DEMO[key] ?? (key === "person" ? null : null);
    return super._v(key);
  }

  _render(full) {
    if (!this._hass || !this._config) return;
    const cfg = this._config, h = this._hass, demo = !!cfg.demo;
    const E = demo ? Object.fromEntries(Object.keys(IOS_DEMO).map((k) => [k, k])) : this._entities();
    const person = demo ? null : h.states[cfg.person];
    const name = demo ? "Camille" : cfg.name || person?.attributes?.friendly_name || (cfg.person ? cfg.person.split(".")[1] : "Personne");
    const pic = demo ? "" : cfg.picture || person?.attributes?.entity_picture || "";
    const pstate = demo ? "not_home" : person?.state;
    const home = pstate === "home";
    const zone = !pstate || !ok(pstate) ? null : home ? "À la maison" : pstate === "not_home" ? "Pas à la maison" : pstate;
    const has = (k) => (demo ? IOS_DEMO[k] != null : !!E[k]);
    const st = (k) => (demo ? null : this._st(k));
    const v = (k) => this._v(k);
    const at = (k, ...n) => (demo ? null : attr(st(k), ...n));
    const entA = (k) => (demo || !E[k] ? "" : ` data-entity="${esc(E[k])}"`);
    const col = (c) => (c ? ` style="--c:var(${c})"` : "");
    /** Nombre et unité d'un capteur, en français. */
    const UNIT = { walk_distance: "m", pressure: "hPa", storage: "%", heart: "bpm", heart_rest: "bpm", heart_walk: "bpm", hrv: "ms", spo2: "%", resp_rate: "/min",
      sleep: "h", sleep_deep: "h", sleep_rem: "h", sleep_core: "h", awake: "h", in_bed: "h", active_energy: "kcal", resting_energy: "kcal", exercise_time: "min",
      stand_hours: "h", move_goal: "kcal", exercise_goal: "min", stand_goal: "h", water: "L", kiosk_brightness: "%", kiosk_volume: "%", watch_battery: "%", battery: "%" };
    const num = (k, digits = 0) => {
      const raw = v(k), n = parseFloat(raw);
      if (raw == null) return null;
      if (!Number.isFinite(n)) return iosFr(raw);
      let u = String((demo ? "" : st(k)?.attributes?.unit_of_measurement) || UNIT[k] || "");
      if (/^%\s*available$/i.test(u)) u = "% libre";
      if (u === "m" && n >= 1000) return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
      if (/^(steps|floors|count)$/i.test(u)) u = "";
      // durées (sommeil, heures debout) : « 7 h 12 » plutôt que « 7,2 h »
      if (/^(h|hr|hours?)$/i.test(u) && !/stand/.test(k)) { const m = Math.round(n * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; }
      if (/^min$/i.test(u) && n >= 60 && /sleep|bed|awake/.test(k)) { const m = Math.round(n); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; }
      return `${n.toLocaleString("fr-FR", { maximumFractionDigits: digits })}${u ? ` ${u}` : ""}`;
    };
    const tile = (k, label, icon, val, c, opts = "") => has(k) && val != null && val !== ""
      ? `<div class="pc-t${opts.includes("wide") ? " wide" : ""}"${entA(k)}${col(c)}><div class="pc-tt"><ha-icon icon="${esc(icon)}"></ha-icon>${esc(label)}</div><b>${esc(val)}</b>${opts.includes("note:") ? `<div class="pc-tn">${esc(opts.split("note:")[1])}</div>` : ""}</div>`
      : "";
    const grid = (tiles) => { const t = tiles.join(""); return t ? `<div class="pc-ts tk-g4">${t}</div>` : ""; };
    const sec = (icon, title, body) => (body.trim() ? `<div class="pc-sec"><div class="pc-h"><ha-icon icon="${icon}"></ha-icon>${esc(title)}</div>${body}</div>` : "");

    // batterie de l'iPhone
    const bat = parseFloat(v("battery")), bstate = String(v("battery_state") || "").toLowerCase();
    const charging = bstate === "charging" || bstate === "full";
    const lowPower = demo ? false : String(at("battery_state", "Low Power Mode") ?? "").toLowerCase() === "true";
    const bl = batLevel(bat);
    // Apple Watch
    const wbat = parseFloat(v("watch_battery")), wchg = /charging|full/i.test(String(v("watch_battery_state") || "")) && !/not/i.test(String(v("watch_battery_state") || ""));
    // réseau
    const conn = String(v("connection") || "").toLowerCase();
    const wifiOn = conn === "wi-fi" || (ok(v("ssid")) && !/not connected/i.test(v("ssid")));
    const cellTech = demo ? "5G" : at("connection", "Cellular Technology");
    const ssid = ok(v("ssid")) && !/not connected/i.test(v("ssid")) ? v("ssid") : null;
    // activité, concentration
    const act = String(v("activity") || "").toLowerCase().trim();
    const [aIcon, aLbl] = ACTIVITY[act] || ["mdi:motion-sensor", act];
    const conf = demo ? "High" : at("activity", "confidence");
    const focusOn = v("focus") === "on";
    // fréquence cardiaque : Apple Santé, sinon capteur de la configuration
    const hrRaw = v("heart") ?? (cfg.heart_rate && h.states[cfg.heart_rate]?.state);
    const hr = parseInt(hrRaw, 10);

    // suivi de position de l'iPhone : celui de l'application compagnon en priorité (pas Life360 ni le routeur)
    const reg = h.entities || {};
    const trk = demo ? null : [].concat(person?.attributes?.device_trackers || []).find((t) => reg[t]?.platform === "mobile_app" && h.states[t]) || E.tracker;
    const trkSt = demo ? { attributes: { speed: 1.4, altitude: 86, course: 225, gps_accuracy: 12, vertical_accuracy: 6, floor: 2 }, state: "not_home" } : trk ? h.states[trk] : null;
    const ta = trkSt?.attributes || {};
    const tnum = (k) => { const x = parseFloat(ta[k]); return Number.isFinite(x) ? x : null; };
    const spd = tnum("speed"), alt = tnum("altitude"), crs = tnum("course"), acc = tnum("gps_accuracy"), vacc = tnum("vertical_accuracy"), flr = tnum("floor");
    const kmh = spd !== null && spd >= 0 ? spd * 3.6 : null;
    const DIRS = ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"];
    const dirOf = (deg) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

    // adresse et distance (comme la carte Présence et téléphone)
    const geoSt = st("geocoded"), geo = v("geocoded");
    const ville = demo ? "Villeneuve" : attr(geoSt, "Locality");
    const where = geo || "";
    let km = NaN;
    if (!demo && !home) {
      const src = trkSt || person;
      const la = parseFloat(src?.attributes?.latitude), lo = parseFloat(src?.attributes?.longitude);
      const hz = h.states["zone.home"]?.attributes;
      const hla = parseFloat(hz?.latitude ?? h.config?.latitude), hlo = parseFloat(hz?.longitude ?? h.config?.longitude);
      if ([la, lo, hla, hlo].every(Number.isFinite)) km = haversine(la, lo, hla, hlo);
      if (Number.isFinite(km) && km < 0.05) km = 0;
    }
    if (demo) km = 2.4;

    // onglet Téléphone
    const pace = parseFloat(v("pace"));
    // allure : la documentation donne m/s ; une valeur > 3 est lue comme des secondes par mètre
    const paceTxt = !Number.isFinite(pace) || pace <= 0 ? null : (() => { const spk = pace > 3 ? pace * 1000 : 1000 / pace; const m = Math.floor(spk / 60), s = Math.round(spk % 60); return `${m} min ${String(s).padStart(2, "0")} /km`; })();
    const pPhone = sec("mdi:cellphone", "iPhone", grid([
      tile("battery_state", "Batterie", charging ? "mdi:battery-charging" : batIcon(bat, false), `${iosFr(v("battery_state"))}${lowPower ? " · économie d'énergie" : ""}`, lowPower ? "--pc-warn" : charging ? "--med-down" : null, lowPower ? "wide" : ""),
      tile("focus", "Concentration", focusOn ? "mdi:moon-waning-crescent" : "mdi:bell-ring-outline", focusOn ? "Activée" : "Désactivée", focusOn ? "--pc-violet" : null),
      tile("activity", "Activité", aIcon, ok(act) && act !== "unknown" ? `${aLbl}${conf ? ` · confiance ${String(conf).toLowerCase() === "high" ? "élevée" : String(conf).toLowerCase() === "medium" ? "moyenne" : "faible"}` : ""}` : "Inconnue", null),
    ])) + sec("mdi:shoe-print", "Activité du jour", grid([
      tile("steps", "Pas", "mdi:shoe-print", num("steps")),
      tile("walk_distance", "Distance", "mdi:map-marker-path", num("walk_distance", 1)),
      tile("floors_up", "Étages montés", "mdi:stairs-up", num("floors_up")),
      tile("floors_down", "Étages descendus", "mdi:stairs-down", num("floors_down")),
      tile("pace", "Allure moyenne", "mdi:run-fast", paceTxt),
      tile("pressure", "Pression", "mdi:gauge", num("pressure", 1)),
    ])) + sec("mdi:watch-variant", "Apple Watch", grid([
      tile("watch_battery", "Batterie de la montre", wchg ? "mdi:battery-charging" : batIcon(wbat, false), num("watch_battery"), LVL[batLevel(wbat)]),
      tile("watch_battery_state", "Charge de la montre", "mdi:watch", iosFr(v("watch_battery_state"))),
    ]));

    // onglet Réseau
    const sim = (k) => {
      if (!has(k)) return "";
      const carrier = demo ? v(k) : at(k, "Carrier Name") || v(k);
      const radio = demo ? "5G" : radioFr(at(k, "Current Radio Technology"));
      const voip = demo ? null : at(k, "Allows VoIP");
      return tile(k, k === "sim1" ? "Carte SIM" : "eSIM", "mdi:sim", [carrier, radio].filter(Boolean).join(" · "), "--med-blue", voip != null ? `note:Appels VoIP ${String(voip).toLowerCase() === "true" ? "autorisés" : "non autorisés"}` : "");
    };
    const pNet = sec("mdi:access-point-network", "Connexion", grid([
      tile("connection", "Connexion", wifiOn ? "mdi:wifi" : conn === "cellular" ? "mdi:signal" : "mdi:signal-off", `${iosFr(v("connection"))}${conn === "cellular" && cellTech ? ` · ${cellTech}` : ""}`, wifiOn ? "--med-down" : conn === "cellular" ? dataColor(cellTech) || "--med-blue" : "--t-red"),
      tile("ssid", "Réseau Wi-Fi", "mdi:wifi", ssid || "Non connecté", ssid ? "--med-down" : null),
      tile("bssid", "Borne Wi-Fi (BSSID)", "mdi:router-wireless", ok(v("bssid")) && !/not connected/i.test(v("bssid")) ? v("bssid") : "Non connecté", null),
      sim("sim1"), sim("sim2"),
    ]));

    // onglet Santé (Apple Santé)
    const ring = (k, goal, label, icon, c) => {
      const val = parseFloat(v(k)), g = parseFloat(v(goal));
      if (!Number.isFinite(val)) return "";
      const pct = Number.isFinite(g) && g > 0 ? Math.round((val / g) * 100) : null;
      return tile(k, label, icon, `${num(k)}${pct != null ? ` sur ${num(goal)} · ${pct} %` : ""}`, pct != null && pct >= 100 ? "--med-down" : c);
    };
    const pHealth = cfg.show_health === false ? "" : sec("mdi:heart-pulse", "Cœur", grid([
      tile("heart", "Fréquence cardiaque", "mdi:heart-pulse", num("heart"), Number.isFinite(hr) ? hrColor(hr) : null),
      tile("heart_rest", "Au repos", "mdi:heart-outline", num("heart_rest")),
      tile("heart_walk", "Moyenne à la marche", "mdi:walk", num("heart_walk")),
      tile("hrv", "Variabilité", "mdi:heart-flash", num("hrv")),
      tile("bp_sys", "Tension (systolique)", "mdi:water-percent", num("bp_sys")),
      tile("bp_dia", "Tension (diastolique)", "mdi:water-percent", num("bp_dia")),
    ])) + sec("mdi:sleep", "Sommeil", grid([
      tile("sleep", "Durée du sommeil", "mdi:sleep", num("sleep", 1), "--pc-violet"),
      tile("in_bed", "Au lit", "mdi:bed", num("in_bed", 1)),
      tile("sleep_deep", "Sommeil profond", "mdi:weather-night", num("sleep_deep", 1)),
      tile("sleep_rem", "Sommeil paradoxal", "mdi:eye-outline", num("sleep_rem", 1)),
      tile("sleep_core", "Sommeil léger", "mdi:weather-night-partly-cloudy", num("sleep_core", 1)),
      tile("awake", "Éveillé", "mdi:eye", num("awake", 1)),
    ])) + sec("mdi:fire", "Activité (Santé)", grid([
      ring("active_energy", "move_goal", "Énergie active", "mdi:fire", "--t-red"),
      ring("exercise_time", "exercise_goal", "Exercice", "mdi:run", "--med-down"),
      ring("stand_hours", "stand_goal", "Heures debout", "mdi:human-handsup", "--med-blue"),
      tile("resting_energy", "Énergie au repos", "mdi:fire-circle", num("resting_energy")),
      tile("h_steps", "Pas (Santé)", "mdi:shoe-print", num("h_steps")),
      tile("h_distance", "Marche et course", "mdi:map-marker-path", num("h_distance", 1)),
      tile("flights", "Étages gravis", "mdi:stairs-up", num("flights")),
      tile("vo2_max", "VO₂ max", "mdi:lungs", num("vo2_max", 1)),
    ])) + sec("mdi:human", "Corps et constantes", grid([
      tile("spo2", "Oxygène dans le sang", "mdi:water-check", num("spo2")),
      tile("resp_rate", "Fréquence respiratoire", "mdi:lungs", num("resp_rate")),
      tile("body_temp", "Température", "mdi:thermometer", num("body_temp", 1)),
      tile("basal_temp", "Température basale", "mdi:thermometer-low", num("basal_temp", 1)),
      tile("glucose", "Glycémie", "mdi:diabetes", num("glucose", 1)),
      tile("weight", "Poids", "mdi:scale-bathroom", num("weight", 1)),
      tile("body_fat", "Masse grasse", "mdi:percent", num("body_fat", 1)),
      tile("lean_mass", "Masse maigre", "mdi:arm-flex", num("lean_mass", 1)),
      tile("height", "Taille", "mdi:human-male-height", num("height", 2)),
      tile("water", "Eau bue", "mdi:cup-water", num("water", 1)),
    ]));

    // onglet Kiosque et caméra
    const motionAt = demo ? null : at("camera_motion", "Last Motion");
    const clients = demo ? null : at("camera_stream", "Clients");
    const pKiosk = cfg.show_kiosk === false ? "" : sec("mdi:tablet-dashboard", "Mode kiosque", grid([
      tile("kiosk_mode", "Mode kiosque", "mdi:tablet-dashboard", iosFr(v("kiosk_mode")), v("kiosk_mode") === "on" ? "--med-down" : null),
      tile("kiosk_screensaver", "Économiseur d'écran", "mdi:monitor-shimmer", iosFr(v("kiosk_screensaver"))),
      tile("kiosk_brightness", "Luminosité", "mdi:brightness-6", num("kiosk_brightness")),
      tile("kiosk_volume", "Volume", "mdi:volume-high", num("kiosk_volume")),
    ])) + sec("mdi:cctv", "Caméra", grid([
      tile("camera_motion", "Mouvement", v("camera_motion") === "on" ? "mdi:motion-sensor" : "mdi:motion-sensor-off", v("camera_motion") === "on" ? "Détecté" : "Aucun", v("camera_motion") === "on" ? "--pc-warn" : null,
        motionAt ? `note:Dernier : ${fmtDate(motionAt, true) || motionAt}` : ""),
      tile("camera_stream", "Flux vidéo", "mdi:video-wireless-outline", iosFr(v("camera_stream")), v("camera_stream") === "streaming" ? "--t-red" : null, clients != null ? `note:${clients} spectateur${Number(clients) > 1 ? "s" : ""}` : ""),
    ]));

    // onglet Infos
    const perm = String(v("location_perm") || "").toLowerCase();
    const permOk = /always/.test(perm);
    const lu = st("last_update");
    const total = demo ? "128 Go" : at("storage", "Total");
    const gtile = (label, icon, val, c, note = "") => val == null ? "" : `<div class="pc-t"${trk && !demo ? ` data-entity="${esc(trk)}"` : ""}${col(c)}><div class="pc-tt"><ha-icon icon="${esc(icon)}"></ha-icon>${esc(label)}</div><b>${esc(val)}</b>${note ? `<div class="pc-tn">${esc(note)}</div>` : ""}</div>`;
    const fr0 = (x, d = 0) => x.toLocaleString("fr-FR", { maximumFractionDigits: d });
    const gps = [
      gtile("Vitesse", "mdi:speedometer", kmh !== null ? `${fr0(kmh, kmh < 10 ? 1 : 0)} km/h` : null, kmh > 1 ? "--med-blue" : null),
      gtile("Direction", "mdi:compass-outline", crs !== null && crs >= 0 && kmh > 1 ? `${dirOf(crs)} (${fr0(crs)}°)` : null),
      gtile("Altitude", "mdi:image-filter-hdr", alt !== null ? `${fr0(alt)} m` : null, null, vacc !== null && vacc >= 0 ? `± ${fr0(vacc)} m` : ""),
      gtile("Précision GPS", "mdi:crosshairs-gps", acc !== null ? `± ${fr0(acc)} m` : null, acc === null ? null : acc <= 20 ? "--med-down" : acc <= 100 ? "--pc-warn" : "--t-red"),
      gtile("Étage", "mdi:office-building-marker", flr !== null ? fr0(flr) : null),
    ].join("");
    // « Position envoyée : Nom de zone seulement » : pas de coordonnées, donc ni distance ni GPS
    const zoneOnly = !demo && trkSt && ta.latitude == null && ta.longitude == null;
    const pGps = gps ? sec("mdi:crosshairs-gps", "Position GPS", `<div class="pc-ts tk-g4">${gps}</div>`)
      : zoneOnly ? sec("mdi:crosshairs-gps", "Position GPS", `<div class="pc-ts"><div class="pc-t wide"${col("--pc-warn")}><div class="pc-tt"><ha-icon icon="mdi:map-marker-off"></ha-icon>Coordonnées</div><b>Non envoyées</b><div class="pc-tn">L'application n'envoie que le nom de la zone. Pour la distance et la position GPS : Paramètres › Application compagnon › serveur › Position envoyée › Exacte.</div></div></div>`) : "";
    const pInfo = pGps + this._extras(demo ? null : trkSt || person) + sec("mdi:information-outline", "Appareil", grid([
      tile("geocoded", "Adresse", "mdi:map-marker-outline", geo, null, "wide"),
      tile("location_perm", "Autorisation de localisation", permOk ? "mdi:map-marker-check" : "mdi:map-marker-alert", iosFr(v("location_perm")), permOk ? "--med-down" : "--pc-warn",
        permOk ? "" : "note:Choisissez « Toujours » dans Réglages iOS › Home Assistant › Position, sinon la position ne se met plus à jour en arrière-plan."),
      tile("last_update", "Dernière mise à jour", "mdi:update", iosFr(v("last_update")), null, lu?.last_changed ? `note:${ago(Date.parse(lu.last_changed))}` : ""),
      tile("storage", "Stockage", "mdi:harddisk", num("storage"), null, total ? `note:sur ${total}` : ""),
      tile("app_version", "Application compagnon", "mdi:cellphone-arrow-down", v("app_version")),
    ]));

    const panels = [["mdi:cellphone", "iPhone", pPhone], ["mdi:wifi", "Réseau", pNet], ["mdi:heart-pulse", "Santé", pHealth], ["mdi:tablet-dashboard", "Kiosque", pKiosk], ["mdi:information-outline", "Infos", pInfo]]
      .filter(([, , p]) => p.trim());
    this._panelIds = panels.map(() => "");
    if (this._tab >= panels.length) this._tab = 0;

    // en-tête « profil »
    const radius = Number(cfg.near_radius) > 0 ? Number(cfg.near_radius) : 5;
    const pres = !pstate || !ok(pstate) ? "" : home ? "home" : Number.isFinite(km) ? (km <= radius ? "near" : "far") : "away";
    const presTip = { home: "À la maison", near: `À moins de ${radius} km de la maison`, far: `À plus de ${radius} km de la maison`, away: "Pas à la maison" }[pres] || "Présence inconnue";
    const meta = [
      has("activity") && ok(act) && act !== "unknown" ? `<span><ha-icon icon="${esc(aIcon)}"></ha-icon>${esc(aLbl)}</span>` : "",
      Number.isFinite(km) ? `<span><ha-icon icon="mdi:map-marker-distance"></ha-icon>${esc(fmtKm(km))}</span>` : "",
      demo ? "" : this._sinceSpan(person, pstate),
      kmh > 3 ? `<span style="color:var(--med-blue)"><ha-icon icon="mdi:speedometer"></ha-icon>${Math.round(kmh)} km/h</span>` : "",
      Number.isFinite(hr) ? `<span style="color:var(${hrColor(hr)})"><ha-icon class="tk-hr" icon="mdi:heart-pulse"></ha-icon>${hr} bpm</span>` : "",
      focusOn ? `<span style="color:var(--pc-violet)"><ha-icon icon="mdi:moon-waning-crescent"></ha-icon>Concentration</span>` : "",
      charging ? `<span style="color:var(--pc-warn)"><ha-icon icon="mdi:flash"></ha-icon>En charge</span>` : "",
    ].join("");
    const icon = (i) => `<ha-icon icon="${i}"></ha-icon>`;
    const dial = (k, label, inner, c, state, tip = label) => `<div class="tk-dial ${state}"${entA(k)}${col(c)} title="${esc(tip)}"><div>${inner}</div><span>${esc(label)}</span></div>`;
    const dials = [
      has("battery") ? dial("battery", "Batterie", `${Number.isFinite(bat) ? Math.round(bat) : "—"}${charging ? `<ha-icon icon="mdi:flash" style="--mdc-icon-size:14px;margin-left:-1px"></ha-icon>` : `<small style="font-size:.62rem">%</small>`}`,
        lowPower ? "--pc-warn" : LVL[bl], "on", `Batterie ${Number.isFinite(bat) ? Math.round(bat) + " %" : ""}${lowPower ? " · économie d'énergie" : ""}`) : "",
      has("connection") || has("ssid") ? dial(has("connection") ? "connection" : "ssid", wifiOn ? "Wi-Fi" : "Mobile", wifiOn ? icon("mdi:wifi") : cellTech && conn === "cellular" ? esc(String(cellTech).slice(0, 4)) : icon("mdi:signal-off"),
        wifiOn ? "--med-down" : conn === "cellular" ? dataColor(cellTech) || "--med-blue" : null, wifiOn || conn === "cellular" ? "on" : "off", wifiOn ? `Wi-Fi : ${ssid || "connecté"}` : conn === "cellular" ? `Mobile ${cellTech || ""}` : "Aucune connexion") : "",
      has("watch_battery") ? dial("watch_battery", "Montre", `${Number.isFinite(wbat) ? Math.round(wbat) : "—"}<small style="font-size:.62rem">%</small>`, LVL[batLevel(wbat)], "on", `Apple Watch ${Number.isFinite(wbat) ? Math.round(wbat) + " %" : ""}${wchg ? " · en charge" : ""}`) : "",
      has("location_perm") && !permOk ? dial("location_perm", "Position", icon("mdi:map-marker-alert"), "--pc-warn", "on", "Localisation pas sur « Toujours »") : "",
    ].join("");

    const html = `
      <div class="tk-hero ${pres}">
        ${cfg.title || demo ? `<div class="tk-top">${esc(cfg.title || "")}${demo ? "<small>Démo</small>" : ""}</div>` : ""}
        <div class="tk-ring"${demo || !cfg.person ? "" : ` data-entity="${esc(cfg.person)}"`} title="${esc(presTip)}">
          <svg viewBox="0 0 92 92"><circle class="bg" cx="46" cy="46" r="42"></circle>${pres ? `<circle class="fg" cx="46" cy="46" r="42"></circle>` : ""}</svg>
          <div class="tk-face">${pic ? `<img src="${esc(pic)}" alt="">` : esc((name || "?").trim().charAt(0).toUpperCase())}</div>
        </div>
        <div class="tk-id">
          <div class="tk-name">${esc(name)}</div>
          <div class="tk-zone"${demo || !cfg.person ? "" : ` data-entity="${esc(cfg.person)}"`}><i></i>${esc((zone || (cfg.person ? "Inconnu" : "Choisissez une personne")) + this._nearTxt(pstate, demo ? null : this._st("tracker") || person))}</div>
          ${where ? `<div class="tk-addr">${esc(where)}</div>` : ville ? `<div class="tk-addr">${esc(ville)}</div>` : ""}
          ${meta ? `<div class="tk-meta">${meta}</div>` : ""}
        </div>
      </div>
      ${dials ? `<div class="tk-dials">${dials}</div>` : ""}
      ${panels.length > 1 ? `<div class="pc-tabs">${panels.map(([i, l], n) => `<button class="pc-tab${n === this._tab ? " on" : ""}" data-tab="${n}"><ha-icon icon="${i}"></ha-icon>${l}</button>`).join("")}</div>` : ""}
      ${panels.map(([, , p], n) => `<div class="panel${n === this._tab ? " on" : ""}">${p}</div>`).join("")}
      ${!panels.length && !demo && !Number.isFinite(bat) ? `<div class="empty">${cfg.person ? "<b>Aucun capteur d'iPhone trouvé</b><span>Activez les capteurs dans l'application Home Assistant : Paramètres › Application compagnon › Capteurs.</span>" : "<b>Choisissez une personne</b><span>dans l'éditeur de la carte.</span>"}</div>` : ""}`;

    if (full || !this._card) {
      this.shadowRoot.innerHTML = `${STYLE}<ha-card></ha-card>`;
      this._card = this.shadowRoot.querySelector("ha-card");
      this._card.addEventListener("click", (ev) => this._click(ev));
    }
    this._card.className = themeClass(cfg.theme, h);
    this._card.innerHTML = html;
  }
}

const IOS_SCHEMA = [
  { name: "person", selector: ent("person") },
  { name: "title", selector: { text: {} } },
  { name: "name", selector: { text: {} } },
  { name: "picture", selector: { text: {} } },
  { name: "heart_rate", selector: ent("sensor") },
  { name: "near_radius", selector: { number: { min: 0.5, max: 100, step: 0.5, mode: "box", unit_of_measurement: "km" } } },
  { name: "places", selector: { object: {} } },
  ...PLACE_FIELDS,
  { name: "travel_times", selector: { object: {} } },
  { name: "show_health", selector: { boolean: {} } },
  { name: "show_kiosk", selector: { boolean: {} } },
  { name: "theme", selector: { select: { mode: "dropdown", options: THEMES.map(([value, label]) => ({ value, label })) } } },
  { name: "demo", selector: { boolean: {} } },
];
const IOS_LABELS = {
  person: "Personne", title: "Titre (vide = nom de la personne)", name: "Nom affiché (vide = celui de la personne)",
  picture: "Photo, adresse d'une image (vide = celle de la personne)", heart_rate: "Fréquence cardiaque (vide = Apple Santé)",
  near_radius: "Rayon « près de la maison » : anneau orange jusqu'à cette distance, rouge au-delà",
  places: "Lieux (onglet Infos) : zones ou capteurs de distance, dans l'ordre voulu ; vide = toutes les zones",
  ...PLACE_LABELS,
  travel_times: "Temps de trajet (onglet Infos) : capteurs Waze ou Google ; vide = ceux trouvés, false = aucun",
  show_health: "Onglet Santé (données Apple Santé)", show_kiosk: "Onglet Kiosque (mode kiosque et caméra)",
  theme: "Couleurs de la carte", demo: "Mode démo : personne et iPhone fictifs, pour les captures d'écran",
};
const IOS_DEFAULTS = { title: "", theme: "v2", near_radius: 5, show_health: true, show_kiosk: true, demo: false, ...PLACE_DEFAULTS };

class TrackerIphoneCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._draw(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; else this._draw(); }
  _draw() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => IOS_LABELS[s.name] || s.name;
      this._form.computeHelper = (s) => (s.name === "person" ? "Les capteurs de l'iPhone de cette personne sont trouvés automatiquement." : undefined);
      this._form.addEventListener("value-changed", (ev) => {
        const cfg = { ...ev.detail.value };
        for (const [k, val] of Object.entries(IOS_DEFAULTS)) if (cfg[k] === val || cfg[k] === undefined) delete cfg[k];
        for (const k of ["name", "picture", "heart_rate", "places", "travel_times"]) if (cfg[k] === "" || cfg[k] == null || (typeof cfg[k] === "object" && !Array.isArray(cfg[k]) && !Object.keys(cfg[k]).length)) delete cfg[k];
        if (Array.isArray(cfg.places) && !cfg.places.length) delete cfg.places; // liste vide = toutes les zones
        this._config = cfg;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = placesSchema(IOS_SCHEMA, this._config);
    this._form.data = { ...IOS_DEFAULTS, ...this._config };
  }
}

define("tracker-card", TrackerCard);
define("tracker-card-editor", TrackerCardEditor);
define("tracker-iphone-card", TrackerIphoneCard);
define("tracker-iphone-card-editor", TrackerIphoneCardEditor);

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
if (!window.customCards.some((c) => c.type === "tracker-iphone-card")) {
  window.customCards.push({
    type: "tracker-iphone-card",
    name: "Présence et iPhone",
    description: "Présence d'une personne et tous les capteurs de son iPhone : batterie, Apple Watch, activité, réseau et opérateur, Apple Santé, kiosque et caméra.",
    preview: true,
    documentationURL: "https://github.com/Marlboro62/tracker",
  });
}

console.info(`%c PRÉSENCE ET TÉLÉPHONE %c ${CARD_VERSION} `, "background:#1d93e3;color:#fff;font-weight:bold;", "background:#1a2434;color:#7cc4ff;");
