# Design system — ÀCoursSûr

## Direction artistique

ÀCoursSûr emprunte à l'affiche pop française son énergie, ses aplats francs et ses formes signalétiques. L'identité repose sur un bleu électrique, un jaune surligneur, des titres condensés et quelques objets graphiques bordés comme des stickers.

L'interface desktop calme volontairement cette énergie : le transcript, les notes et les contenus longs restent sur des surfaces crème ou blanches, sans motif décoratif. La couleur sert à s'orienter, agir et mémoriser — jamais à décorer une zone de lecture.

Principes :

- **Fort au premier regard, calme à l'usage** : identité dense dans la navigation et les en-têtes, lecture neutre au centre.
- **La couleur a un sens** : bleu pour la structure, jaune pour l'attention, rose pour l'enregistrement, cyan pour les états locaux/positifs.
- **Des formes physiques** : contours sombres, ombres franches et légères inclinaisons sur les éléments de marque uniquement.
- **Pas de folklore IA** : aucun robot, halo, gradient SaaS ou conversation centrale. L'analyse reste une action secondaire.

## Tokens

| Token | Valeur | Usage |
|---|---:|---|
| `--ink` | `#17143D` | Texte, contours, ombres franches |
| `--paper` | `#F7F5EE` | Fond général reposant |
| `--surface` | `#FFFEFA` | Transcript, panneaux, modales |
| `--line` | `#DCD9E5` | Séparateurs et bordures calmes |
| `--blue` | `#2D2AE8` | Navigation, actions principales, repères |
| `--yellow` | `#FFF86E` | Attention, timer, sélection |
| `--aqua` | `#82E7E4` | Local, révision, retour positif |
| `--pink` | `#ED2BB8` | Enregistrement et accent exceptionnel |
| `--lilac` | `#DAB0F4` | Examen et supports de révision |
| `--peach` | `#F7B8AA` | Incompréhension et alerte douce |

## Typographie

- Interface et lecture : `Segoe UI Variable`, puis `Segoe UI`.
- Titres d'affiche : `Impact`, puis `Arial Narrow`, réservés aux titres courts en capitales.
- Horodatage : `Cascadia Mono`, puis `Consolas`.
- Corps : 14–15 px, interligne 24–28 px pour les longues sessions.

## Géométrie et profondeur

- Rayon courant : 8 px pour les contrôles, 16 px pour les panneaux.
- Espacement de base : 4 px ; groupes usuels de 8, 12, 16, 24 et 32 px.
- Ombre fonctionnelle : discrète ou absente.
- Ombre de marque : décalage net de 3 à 7 px en `--ink`, uniquement sur CTA, hero et stickers.

## Composants

- **Bouton primaire** : bleu, texte blanc en capitales, contour et ombre `--ink`.
- **Bouton secondaire** : blanc, contour `--ink`, survol jaune.
- **Champ** : blanc, bordure calme ; focus bleu avec halo fin.
- **Sidebar** : aplat bleu, navigation sélectionnée jaune, matières signalées en cyan.
- **Panneau** : surface blanche, bordure `--line`, rayon 16 px.
- **Marqueurs** : jaune / pêche / cyan / lilas, tous avec le même contour sombre.
- **États** : jamais indiqués par la couleur seule ; label ou icône obligatoire.

## Règles par écran

- **Accueil / semestre / matière** : le hero porte l'identité ; les listes restent neutres et compactes.
- **Cours en direct** : transcript blanc à gauche, notes crème à droite, timer jaune, enregistrement rose. Aucun décor derrière le texte.
- **Cours terminé** : les onglets gardent le même cadre ; l'audio reste toujours visible en bas.
- **Recherche** : champ très identifiable, résultats sobres et horodatés.
- **Révisions** : accents colorés sur les types de support, distinction explicite entre faits du professeur et importance inférée.
- **Paramètres** : couleur par section, descriptions de confidentialité toujours visibles.

## Accessibilité

- Contraste élevé texte/fond et focus clavier visible.
- Zones d'action d'au moins 36 px.
- Icônes accompagnées d'un libellé, sauf boutons ayant un `aria-label`.
- Les grandes listes utilisent `content-visibility` pour préserver la fluidité.

## Référence

Direction inspirée du projet *KIFF TON APÉRO — Master brand identity* de Mirabello Fiona, adaptée et redessinée pour un usage logiciel prolongé. Aucun logo, sticker ou visuel original n'est repris.
