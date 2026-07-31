[English](../../research/effort-wheel-calibration.md) · [Français](effort-wheel-calibration.md)

# Molette Effort Claude — calibrage de la macro

## Verdict

La macro du mode Effort porte deux temporisations, pour environ **90 ms par
cran** : `80 ms` sur la libération de ⌘ et `10 ms` sur `Esc`. L'étape de la
flèche reste volontairement à `0`.

La première version de cette macro coûtait 900 ms par cran. Le facteur dix ne
vient pas d'avoir essayé plus de valeurs, mais d'avoir changé la **forme** de la
macro pour que chaque mesure devienne interprétable.

## Pourquoi `Esc` est obligatoire

`⌘⇧E` est une **bascule**, vérifié sur Claude Desktop : l'envoyer deux fois de
suite ouvre puis referme le sélecteur.

Chaque cran doit donc refermer le sélecteur lui-même. Sans le `Esc` final, le
cran suivant refermerait le sélecteur au lieu de l'ouvrir, et le niveau serait
sauté. C'est aussi la cause la plus probable des niveaux perdus lors d'un
balayage rapide : deux macros qui se chevauchent désynchronisent la bascule.

## Pourquoi la forme est asymétrique

Input ne documente pas si le champ `delay` d'une étape s'applique **avant** ou
**après** cette étape, et aucune source ne permet de le trancher : l'application
n'exécute jamais les macros, elle écrit `keymap.json` sur la flash de la carte et
le firmware seul interprète le champ.

Tant que l'attente était répartie sur deux étapes, les deux lectures donnaient au
sélecteur des durées différentes, et chaque essai mesurait donc autre chose que
ce qu'on croyait régler. En posant toute l'attente sur la libération de ⌘ et `0`
sur la flèche, les deux lectures deviennent équivalentes :

| lecture | déroulé | attente reçue par le sélecteur |
| --- | --- | --- |
| « après » | ⌘ relâché, attente, flèche | la constante |
| « avant » | attente, ⌘ relâché, flèche | la constante |

Le délai d'ouverture devient alors exactement égal à la constante. Ne pas
répartir cette attente sur les deux étapes : cela double ce délai sans rien
garantir de plus. Le coût total d'un cran inclut aussi les `10 ms` de retour
visuel portés par `Esc`.

## Calibrage mesuré sur matériel

Échelle testée sur Codex Micro, une valeur par touche, toutes en « effort +1 »
pour que le sens ne soit pas une variable :

| attente d'ouverture | résultat |
| --- | --- |
| 120 ms | change le niveau |
| 80 ms | change le niveau |
| 60 ms | change le niveau |
| 40 ms | change le niveau |
| 20 ms | échoue |
| 0 ms | échoue |

Le plancher est donc entre 20 et 40 ms. La valeur retenue, `80 ms`, double le
plancher mesuré.

`40 ms` a été essayé en exploitation et jugé moins fiable qu'en test isolé. C'est
cohérent : le plancher a été mesuré sur un sélecteur déjà chaud, alors que le
temps de montage réel dépend de la charge du renderer. **Un plancher n'est pas
une valeur d'exploitation.** En dessous d'environ 100 ms la différence de latence
n'est pas perceptible, alors qu'un niveau perdu l'est immédiatement : la bonne
cible est la plus petite valeur qui ne rate jamais, pas la plus petite qui
marche.

L'échec en dessous du plancher n'est pas bruyant. La flèche part avant que le
sélecteur ait le focus, et le changement est perdu sans message d'erreur. Toute
baisse doit donc être validée par plusieurs répétitions **et** par une première
ouverture à froid, au retour d'une autre application.

## Pourquoi `Esc` porte 10 ms

Sans attente sur cette étape, la flèche et `Esc` sont émis sans écart et Claude
les traite dans le même tour de boucle : le sélecteur s'ouvre et se referme sans
jamais peindre une image montrant le slider à son nouveau niveau. Le niveau
change bien, mais **à l'aveugle** — l'effet visible n'est qu'un clignotement.

`10 ms` suffisent à laisser passer une image, et le niveau atteint devient
lisible. Cette attente est payée **après** que le niveau a changé : elle allonge
la macro sans retarder son effet.

Conséquence méthodologique : les 300 ms que portait la première version de la
macro à cet endroit n'étaient pas du temps mort. Elles avaient été supprimées sur
le seul critère de la latence, ce qui a fait perdre le retour visuel sans que le
critère retenu puisse le détecter.

## Sens de rotation

La cellule d'encodeur d'indice `0` est **physiquement horaire**, confirmé sur
matériel. C'est l'inverse de ce que suggèrent les noms du gabarit d'usine, qui
nomme les trois cellules `KV_OAI_ENC_CC`, `KV_OAI_ENC_CW`, `KV_OAI_ENC_CLK`.

Deux inversions se superposent, ce qui rend l'erreur facile :

- le firmware délivre les deux événements de rotation permutés par rapport aux
  noms de cellules du vendeur ;
- Input 0.17.3 permute en plus les libellés `CW` et `CCW` de son éditeur pour
  tout encodeur à trois cellules, si bien que son interface contredit les noms de
  keycodes de son propre gabarit par défaut.

Le générateur écrit le JSON directement et contourne donc le second point. Ne pas
aligner `PHYSICAL_ENCODER_SLOTS` sur ce qu'affiche l'éditeur, ni sur les noms de
keycodes : cela inverse la molette.

## Pourquoi le regroupement des crans a été écarté

Faire coûter un seul cycle `⌘⇧E` / `Esc` à N crans demande trois choses : un
compteur persistant, une temporisation non bloquante, et l'émission de frappes
clavier.

Le SDK MicroPython embarqué fournit les deux premières — un compteur de crans via
`EVENT.ENCODER`, et une temporisation approchée via le hook de frame — mais
**aucune API d'émission de frappes**. Ce SDK n'est de plus pas disponible sur le
Codex Micro : il est réservé au Nomad [E] v1, et Input ne présente pas d'onglet
Widgets pour ce modèle. Le format `keymap.json` n'offre pas d'alternative : ni
compteur, ni condition, ni bascule, le seul état retenu par le firmware étant le
layer et le profil actifs.

Le regroupement exige donc un agent sur l'hôte. À 900 ms par cran il se
justifiait largement ; à 90 ms, cinq crans coûtent 450 ms contre environ 300 ms
pour un agent qui les regroupe, et l'écart ne paie plus un démon ni une
autorisation d'accessibilité.

## Ce qui reste non prouvé

- **La sémantique de `delay`.** Le comportement observé sur l'étape `Esc` indique
  qu'elle s'applique avant son étape, puisque dans la lecture « après » ces 10 ms
  seraient du temps mort en fin de macro et ne changeraient rien à l'affichage.
  Ce n'est pas une preuve. Test décisif : porter `500 ms` sur l'étape `Esc`. Si le
  sélecteur reste visiblement affiché une demi-seconde, c'est « avant » ; s'il se
  referme aussitôt et que c'est la molette qui reste inerte, c'est « après ».
- **Le sort des événements d'encodeur pendant l'exécution d'une macro** : mis en
  file ou perdus. Le firmware n'est pas du QMK — c'est un ESP32-S3 sous FreeRTOS
  avec un firmware maison — donc l'hypothèse d'une boucle de scan gelée pendant
  l'attente est infondée.
- **Le délai maximal accepté par le firmware.** L'interface d'Input plafonne la
  saisie à 9999 ms, mais rien ne borne la valeur à l'import : un JSON écrit à la
  main transmet ce qu'il veut.
