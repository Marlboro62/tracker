<p>
  ☕ <strong>Si cette carte vous est utile, vous pouvez soutenir le projet :</strong>
</p>

<div style="white-space: nowrap; line-height: 0;">
  <a
    href="https://www.buymeacoffee.com/Marlboro62"
    target="_blank"
    rel="noopener noreferrer"
    style="display: inline-block; text-decoration: none; vertical-align: middle;"
  ><img
    src="https://img.buymeacoffee.com/button-api/?text=Offrir%20un%20caf%C3%A9&emoji=%E2%98%95&slug=Marlboro62&button_colour=FF5F5F&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00"
    alt="Offrir un café sur Buy Me a Coffee"
    height="45"
    style="display: block; border: 0;"
  ></a>&nbsp;&nbsp;<a
    href="https://ko-fi.com/M4M2QL45X"
    target="_blank"
    rel="noopener noreferrer"
    style="display: inline-block; text-decoration: none; vertical-align: middle;"
  ><img
    src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
    alt="Soutenir le projet sur Ko-fi"
    height="45"
    style="display: block; border: 0;"
  ></a>
</div>


# Carte Présence et téléphone

[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://hacs.xyz/)
[![Release](https://img.shields.io/github/v/release/Marlboro62/tracker)](https://github.com/Marlboro62/tracker/releases)

Une carte Lovelace pour Home Assistant qui montre **où est une personne** et **l'état de son téléphone** : batterie et charge, activité, distance de la maison, sonnerie, notifications (avec leur contenu et le dernier SMS), VPN WireGuard, prochaine alarme, Wi-Fi, réseau mobile, Bluetooth, carte SIM, GPS, adresse, IP publique. Tout est **en français**.

Il suffit de choisir la personne : la carte **trouve toute seule les capteurs de son téléphone** (application compagnon Home Assistant, Android ou iPhone). Aucun YAML à écrire, aucune intégration en plus.

| Téléphone | Réseau | Notifications |
|---|---|---|
| ![Onglet Téléphone](images/telephone.png) | ![Onglet Réseau](images/reseau.png) | ![Onglet Notifications](images/notifications.png) |

| Infos | Clair |
|---|---|
| ![Onglet Infos](images/infos.png) | ![Couleurs claires](images/clair.png) |

*Captures réalisées en mode démo : personne, adresse et téléphone fictifs.*

🎮 **[Essayer la démo en ligne](https://marlboro62.github.io/tracker/docs/demo.html)** : la vraie carte avec trois personnes fictives (à la maison, près de la maison, loin), sans installer Home Assistant.

**En-tête « profil »** : la photo (ou l'initiale) est entourée d'un **anneau de présence** : **vert** à la maison, **orange** près de la maison (5 km par défaut, option `near_radius`), **rouge** au-delà. La pastille de zone et le halo de fond prennent la même couleur. À côté : le nom, l'adresse, l'activité, la distance de la maison et la fréquence cardiaque. En dessous, une rangée de **pastilles rondes** donne l'état d'un coup d'œil : batterie (avec l'éclair de charge), Wi-Fi, réseau mobile (4G, 5G…), Bluetooth, VPN, nombre de notifications et heure de la prochaine alarme ; une pastille en pointillés signale ce qui est coupé.

## Installation

### Avec HACS (recommandé)

1. Dans HACS, cherchez **Carte Présence et téléphone** et installez-la.
2. Rechargez la page (Ctrl+F5).

Si la carte n'apparaît pas encore dans la recherche de HACS, ajoutez le dépôt à la main : menu **⋮** → **Dépôts personnalisés**, adresse `https://github.com/Marlboro62/tracker`, type **Tableau de bord** (Dashboard), puis cherchez **Carte Présence et téléphone**.

### Manuelle

Copiez `tracker-card.js` dans `/config/www/`, puis ajoutez la ressource `/local/tracker-card.js` (type **Module JavaScript**) dans **Paramètres → Tableaux de bord → ⋮ → Ressources**.

## Configuration

Le plus simple : **Modifier le tableau de bord → Ajouter une carte → Présence et téléphone**, puis choisissez la personne. Ou en YAML :

```yaml
type: custom:tracker-card
person: person.camille
```

C'est tout : le suivi de position de la personne mène à son téléphone, et la carte prend les capteurs de l'application compagnon de cet appareil. Les tuiles sans capteur ne s'affichent pas, un onglet vide non plus.

### Options

| Option | Description | Défaut |
|---|---|---|
| `person` | La personne suivie (`person.…`) | — |
| `name` | Nom affiché | celui de la personne |
| `picture` | Photo (adresse d'une image) | celle de la personne |
| `title` | Titre de la carte (vide : le nom de la personne) | — |
| `theme` | `v2` bleu nuit, `auto` clair ou sombre selon Home Assistant, `ha` couleurs du thème Home Assistant | `v2` |
| `find_phone_script` | Script ou bouton qui fait sonner le téléphone : affiche le bouton **Faire sonner le téléphone** | — |
| `near_radius` | Rayon « près de la maison » en km : anneau orange jusqu'à cette distance, rouge au-delà | `5` |
| `heart_rate` | Capteur de fréquence cardiaque (montre), affiché à côté de l'activité | — |
| `notifications` | `false` : ne pas afficher le contenu des notifications (onglet Notifications et dernier SMS) | `true` |
| `system_notifications` | `false` : ne pas lister les notifications du système (Android, constructeur, services Google) | `true` |
| `notifications_max` | Nombre de notifications listées au plus, par section | `20` |
| `demo` | `true` : personne et téléphone fictifs, pour partager une capture sans rien dévoiler | `false` |
| `phone` | Entités du téléphone à utiliser à la place de celles trouvées automatiquement (voir ci-dessous) | — |

### Capteurs du téléphone

Activez-les dans l'application compagnon (**Paramètres → Application compagnon → Gérer les capteurs**). Sur iPhone, iOS ne donne pas la sonnerie, l'alarme, le Bluetooth ni les notifications : la carte affiche à la place la concentration et l'activité du jour. La carte reconnaît les capteurs à la fin de leur identifiant :

| Clé sous `phone:` | Capteur de l'application compagnon | Affichage |
|---|---|---|
| `battery` | `…_battery_level` | Pastille Batterie |
| `charging` / `battery_state` | `…_is_charging` (Android) / `…_battery_state` (iPhone) | En charge |
| `charger_type` | `…_charger_type` | Secteur, USB, sans fil |
| `activity` | `…_detected_activity` (Android) / `…_activity` (iPhone) | Activité |
| `ringer` | `…_ringer_mode` | Sonnerie |
| `notif_count` | `…_active_notification_count` | Notifications |
| `next_alarm` | `…_next_alarm` | Prochaine alarme (en rouge dans l'heure qui vient) |
| `network_type` | `…_network_type` / `…_connection_type` | Pastille réseau |
| `data_network` | `…_data_network_type_sim_1` | Réseau mobile (4G, 5G…) |
| `wifi_state` / `wifi_ssid` | `…_wifi_state` / `…_wifi_connection` ou `…_ssid` | Wi-Fi |
| `hotspot` | `…_hotspot_state` | Partage de connexion |
| `vpn` | `binary_sensor.wgdashboard_…_connected` (intégration [wgdashboard_monitor](https://github.com/Marlboro62/wgdashboard_monitor)) | VPN WireGuard |
| `bt_state` / `bt_conn` | `…_bluetooth_state` / `…_bluetooth_connection` | Bluetooth |
| `sim` | `…_sim_1` | Carte SIM |
| `high_acc` | `…_high_accuracy_mode` | GPS haute précision |
| `geocoded` | `…_geocoded_location` | Adresse, rue et ville |
| `public_ip` | `…_public_ip_address` | IP publique |
| `last_reboot` | `…_last_reboot` | Dernier redémarrage |
| `focus` / `focus_name` | `…_focus` / `…_focus_name` (iPhone) | Concentration (Ne pas déranger, Sommeil…) |
| `steps` / `walk_distance` / `floors_up` | `…_steps` / `…_distance` / `…_floors_ascended` (iPhone) | Activité du jour : pas, distance, étages |
| `pressure` | `…_pressure` (iPhone) | Pression atmosphérique |
| `storage` / `app_version` | `…_storage` / `…_app_version` | Stockage, version de l'application compagnon |
| `tracker` | le `device_tracker` du téléphone | Distance calculée depuis la maison |
| `proximity` | facultatif : un capteur de distance (m, km ou miles) à utiliser à la place du calcul | Distance |
| `rue` / `ville` | facultatif : vos propres capteurs à la place du découpage de l'adresse | Rue et ville |

Ce que la carte calcule elle-même, sans capteur modèle à créer :

- **Distance** : calculée entre la position GPS du téléphone et la zone Maison, sans intégration Proximité ni capteur. Moins de 50 m compte comme à la maison (0 m).
- **Rue et ville** : lues dans les attributs de l'adresse géocodée, sinon découpées dans son texte (« rue, code postal ville »).
- **VPN WireGuard** (intégration wgdashboard_monitor) : la carte prend le peer dont le nom correspond au téléphone ou à la personne (`binary_sensor.wgdashboard_wg0_<peer>_connected`) et affiche, à côté des notifications, s'il est connecté, son dernier handshake et les données reçues et envoyées. Une pastille ronde VPN s'affiche sous la photo. Si le nom du peer ne correspond pas, indiquez-le sous `phone: vpn:`.
- **Notifications** (Android) : le contenu de chaque notification (application, titre, message, heure) est lu dans les attributs du capteur `…_active_notification_count`. L'onglet **Notifications** les liste de la plus récente à la plus ancienne, en deux sections : **Applications** (messages, WhatsApp, Home Assistant…) et **Système** (Android, Xiaomi, Samsung, Nothing, services Google…), et la tuile **Dernier SMS** montre le dernier message reçu dans l'application Messages, avec son expéditeur.

Pour forcer une entité, indiquez-la sous `phone:` ; les autres restent détectées :

```yaml
type: custom:tracker-card
person: person.camille
heart_rate: sensor.montre_camille_heart_rate
find_phone_script: script.faire_sonner_camille
phone:
  wifi_ssid: sensor.pixel_camille_wifi_connection
```

### Interactions

- **Onglets** Téléphone, Réseau, Notifications, Infos (sur une carte étroite, les onglets inactifs n'affichent que leur icône).
- **Clic sur une tuile**, la batterie ou la photo : ouvre la fenêtre de détails de Home Assistant (historique, attributs).
- **Clic sur la tuile Notifications ou Dernier SMS** : ouvre l'onglet Notifications.
- **Faire sonner le téléphone** : lance le script (ou appuie sur le bouton) indiqué dans `find_phone_script`.

## Vie privée

La carte affiche la position, l'adresse et le contenu des notifications de la personne suivie : réservez-la aux tableaux de bord des personnes concernées, ou masquez les notifications avec `notifications: false`. Elle ne contacte aucun service extérieur, tout est lu dans Home Assistant. Pour une capture à partager, activez le **mode démo** (`demo: true`).

## Démo

[Démo en ligne](https://marlboro62.github.io/tracker/docs/demo.html), ou [`docs/demo.html`](docs/demo.html) ouvert avec un petit serveur web local (par exemple `python3 -m http.server` à la racine du dépôt) : trois personnes fictives, avec la détection automatique des capteurs.

## Support

Questions, bugs et idées : uniquement via les **[Issues GitHub](https://github.com/Marlboro62/tracker/issues)**, pour que tout le monde profite des réponses.

## Licence

MIT

## Nom du projet et forks

Ce dépôt est la seule source officielle de la **Carte Présence et téléphone** (releases, HACS, support),
maintenu par [Marlboro62](https://github.com/Marlboro62).

La licence MIT autorise à copier, modifier et redistribuer le code. Si vous publiez une version modifiée :

- gardez les mentions de copyright du fichier [`LICENSE`](https://github.com/Marlboro62/tracker/blob/main/LICENSE) (© Marlboro62) ;
- **donnez-lui un autre nom** et un autre type de carte (`custom:tracker-card` est celui de ce dépôt) :
  Home Assistant ne peut pas charger deux cartes du même type, et personne ne doit confondre les deux versions dans HACS ;
- ne la présentez pas comme la version officielle et n'orientez pas vers ce dépôt les demandes
  de support qui concernent votre version.

Une correction ou une idée ? Les **pull requests** et les **issues** sont les bienvenues ici :
elles profitent à tous les utilisateurs.
