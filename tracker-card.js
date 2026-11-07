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

const CARD_VERSION = "1.1.1-beta.1";

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
};
const PHONE_GROUPS = [
  ["Batterie", [["battery", "Niveau de batterie", "sensor"], ["charging", "En charge", "binary_sensor"], ["battery_state", "État de la batterie (iPhone)", "sensor"], ["charger_type", "Type de chargeur", "sensor"]]],
  ["Réseau", [["network_type", "Type de réseau", "sensor"], ["data_network", "Réseau mobile (4G, 5G…)", "sensor"], ["wifi_state", "Wi-Fi activé", "binary_sensor"], ["wifi_ssid", "Réseau Wi-Fi", "sensor"],
    ["hotspot", "Partage de connexion", "binary_sensor"], ["vpn", "VPN WireGuard : peer connecté (wgdashboard_monitor)", "binary_sensor"], ["bt_state", "Bluetooth activé", "binary_sensor"], ["bt_conn", "Connexion Bluetooth", "sensor"], ["sim", "Carte SIM", "sensor"], ["high_acc", "GPS haute précision", "binary_sensor"]]],
  ["Activité et notifications", [["activity", "Activité détectée", "sensor"], ["ringer", "Mode de sonnerie", "sensor"], ["notif_count", "Notifications", "sensor"], ["next_alarm", "Prochaine alarme", "sensor"]]],
  ["Localisation", [["tracker", "Suivi de position (device_tracker)", "device_tracker"], ["proximity", "Distance de la maison (facultatif, sinon calculée)", "sensor"], ["geocoded", "Adresse géocodée", "sensor"], ["rue", "Rue", "sensor"], ["ville", "Ville", "sensor"]]],
  ["Système", [["public_ip", "IP publique", "sensor"], ["last_reboot", "Dernier redémarrage", "sensor"]]],
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
    const fp = `${this._config.theme}|${h.themes?.darkMode}|` + (this._config.demo ? "demo" : [this._config.person, this._config.heart_rate, ...Object.values(ents)]
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
    for (const [key, res] of Object.entries(PHONE_KEYS)) {
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
    const p0 = sec("mdi:cellphone-information", "Téléphone", `<div class="pc-ts tk-g4">
        ${tile("ringer", "Sonnerie", rIcon, rLbl, rCol)}
        ${tile("next_alarm", "Prochaine alarme", "mdi:alarm", alarm, alarmMs > 0 && alarmMs < 3600e3 ? "--t-red" : alarmIso ? "--pc-warn" : null)}
        ${vpnTile}
        ${smsTile}
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
      tile("geocoded", "Adresse", "mdi:map-marker-outline", geo, null, "wide"),
    ].join("");
    const p2 = sec("mdi:information-outline", "Appareil", infoTiles ? `<div class="pc-ts">${infoTiles}</div>` : "");

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
      has("activity") ? `<span><ha-icon icon="${esc(aIcon)}"></ha-icon>${esc(aLbl)}</span>` : "",
      Number.isFinite(km) ? `<span><ha-icon icon="mdi:map-marker-distance"></ha-icon>${esc(fmtKm(km))}</span>` : "",
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
          <div class="tk-zone"${demo || !cfg.person ? "" : ` data-entity="${esc(cfg.person)}"`}><i></i>${esc(zone || (cfg.person ? "Inconnu" : "Choisissez une personne"))}</div>
          ${where ? `<div class="tk-addr">${esc(where)}</div>` : ""}
          ${meta ? `<div class="tk-meta">${meta}</div>` : ""}
        </div>
      </div>
      ${dials ? `<div class="tk-dials">${dials}</div>` : ""}
      ${panels.length > 1 ? `<div class="pc-tabs">${panels.map(([i, l], n) => `<button class="pc-tab${n === this._tab ? " on" : ""}" data-tab="${n}"><ha-icon icon="${i}"></ha-icon>${l}${panels[n][3] === "notifs" ? ` <small>${appN.length + sysN.length}</small>` : ""}</button>`).join("")}</div>` : ""}
      ${panels.map(([, , p], n) => `<div class="panel${n === this._tab ? " on" : ""}">${p}</div>`).join("")}
      ${!panels.length && !demo ? `<div class="empty">${cfg.person ? "<b>Aucun capteur de téléphone trouvé</b><span>Indiquez-les dans l'éditeur de la carte (section Téléphone).</span>" : "<b>Choisissez une personne</b><span>dans l'éditeur de la carte.</span>"}</div>` : ""}`;

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

  async _find(btn) {
    const id = this._config.find_phone_script;
    if (!id || this._config.demo) return;
    btn.classList.add("armed");
    try {
      const [dom] = id.split(".");
      if (dom === "button" || dom === "input_button") await this._hass.callService(dom, "press", { entity_id: id });
      else await this._hass.callService("script", "turn_on", { entity_id: id });
    } catch (e) {
      console.error("[tracker-card] impossible de lancer", id, e);
    }
    setTimeout(() => btn.classList.remove("armed"), 3000);
  }
}

/* ============================================================== éditeur */
// même éditeur que les autres cartes : formulaire Home Assistant (ha-form)
const ent = (domain) => ({ entity: { domain } });
const SCHEMA = [
  { name: "person", selector: ent("person") },
  { name: "title", selector: { text: {} } },
  { name: "name", selector: { text: {} } },
  { name: "picture", selector: { text: {} } },
  { name: "find_phone_script", selector: { entity: { domain: ["script", "button", "input_button"] } } },
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
  heart_rate: "Fréquence cardiaque (montre)",
  near_radius: "Rayon « près de la maison » : anneau orange jusqu'à cette distance, rouge au-delà",
  notifications: "Afficher le contenu des notifications et le dernier SMS",
  system_notifications: "Afficher aussi les notifications du système (Android, constructeur, services Google)",
  notifications_max: "Nombre de notifications listées au plus, par section",
  theme: "Couleurs de la carte",
  demo: "Mode démo : personne et téléphone fictifs, pour les captures d'écran",
  ...Object.fromEntries(PHONE_GROUPS.flatMap(([, f]) => f.map(([k, l]) => [k, l]))),
};
const DEFAULTS = { title: "", theme: "v2", near_radius: 5, notifications: true, system_notifications: true, notifications_max: 20, demo: false };

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
        for (const k of ["name", "picture", "find_phone_script", "heart_rate"]) if (!cfg[k]) delete cfg[k];
        const phone = Object.fromEntries(Object.entries(cfg.phone || {}).filter(([, v]) => v));
        if (Object.keys(phone).length) cfg.phone = phone; else delete cfg.phone;
        this._config = cfg;
        this._auto();
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = SCHEMA;
    this._form.data = { ...DEFAULTS, ...this._config, phone: { ...(this._config.phone || {}) } };
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
