# Habillage 3D : cahier des charges pour le modeleur

But : de vrais modèles 3D des pièces (hoodie, tee, jogging, ceinture), à la forme et aux détails exacts des produits de marierohana.com, portés par les deux avatars du fichier `rm_avatars_v3.blend` (avatar_f et avatar_m).

## Pièces et détails attendus (d'après les photos du site)
- **BIG ZIPPER HOODIE** (6 coloris) : coupe courte et ajustée, manches longues avec manchettes qui couvrent la main (trou pour le pouce), bande côtelée en bas, capuche (relevable) avec cordons, poche kangourou, grande fermeture centrale avec son curseur à anneau (couleur propre à chaque coloris), petit patch en bas à gauche.
- **2026TEE** (4 imprimés) : ajusté, manches courtes, encolure ronde ; les imprimés (rayures, pomme-vampire, fermeture, éclaboussures) en texture.
- **SPIRAL JOGGING** (noir, gris) : très très large, taille basse avec double ceinture (la bande noire du boxer dépasse), cordon, poches ; le bas tombe et s'étale au sol en gros plis.
- **SILICONE GUNBELT** (9 couleurs) : ceinture en silicone avec un pistolet moulé ; portée basse sur les hanches, parfois plusieurs.

## Format
- Un fichier **.glb par pièce et par avatar**, nommé `<slot>_<f|m>.glb`, par exemple `bigzip-blackpink_f.glb`, `jog-grey_m.glb`, `tee-2_f.glb`, `belt-yellow_m.glb`.
  Les slots sont dans `js/data.js` (belt-green, belt-yellow… bigzip-blackblack, bigzip-greygrey, bigzip-greyblue, bigzip-blackpink, bigzip-redgreen, bigzip-lilmarcel, tee-1 à tee-4, jog-black, jog-grey).
- **Mêmes unités et même position que l'avatar** : mètres, pieds de l'avatar à Y=0 (Z=0 dans Blender avant export Y-up), avatar au centre. La pièce doit épouser l'avatar tel quel dans `rm_avatars_v3.blend` (pose A, bras légèrement écartés).
- **Modèle fixe, sans squelette ni animation** : l'avatar tourne seulement sur lui-même.
- Textures en JPG ou PNG, 1024 px maximum, incluses dans le .glb. Normales possibles.
- Poids : environ 1,5 Mo maximum par fichier (le projet entier doit rester sous 50 Mo : 7 coloris x 2 avatars x 4 pièces = environ 60 fichiers, donc privilégier la légèreté, et partager le maillage entre coloris en ne changeant que la texture).
- Ne pas exporter l'avatar lui-même : seulement le vêtement.

## Où mettre les fichiers
`assets/models/garments/`. Puis, dans `js/data.js`, ajouter le slot à la liste `GARMENT_FILES` (par exemple `'bigzip-blackpink'`). L'app charge alors le vrai modèle à la place de la forme simple, pour F et M. Un slot absent de la liste garde la forme simple actuelle.
