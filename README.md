# Akinator-LLM

Un Akinator minimaliste qui utilise un LLM. On penses à quelque chose (personnage, objet, animal, lieu, concept), et le modèle pose des questions et il essaie de deviner.

## Fonctionnement

- Backend Flask ([app.py](app.py)) qui transmet les tours de jeu vers le LLM [OpenRouter](https://openrouter.ai/).
- Frontend en trois fichiers : structure ([index.html](index.html)), style ([static/style.css](static/style.css)) et logique de jeu ([static/jeu.js](static/jeu.js)) : avec 5 réponses possibles : *Oui, Non, Souvent, Parfois, Je ne sais pas*. Flask sert le dossier `static/` automatiquement, sans configuration.
- Le prompt système impose une stratégie de **dichotomie** sur les candidats restants (pas de simple énumération).
- Les parties terminées sont enregistrées dans une base **SQLite** (`parties.db`, créée automatiquement au premier lancement si elle n'existe pas) et présentées en bas de page : date, succès ou échec, réponse et nombre de coups. Un bouton permet d'effacer cet historique.

Une partie se termine dans deux cas : le modèle devine juste (« Oui, gagné »), ou l'utilisateur déclare forfait pour lui (« J'abandonne ») et saisit alors la réponse à laquelle il pensait.

## Lancer

Prérequis : [uv](https://docs.astral.sh/uv/) installé.

Puis, copie le modèle de configuration et renseigne une clé [OpenRouter](https://openrouter.ai/keys) :

```sh
cp .env.example .env
# puis éditer .env pour y coller la clé
```

Lance le serveur (le script lit le `.env` tout seul) :

```sh
uv run app.py
```

Puis ouvre <http://localhost:5001>.

La clé n'est jamais committée : `.env` est ignoré par git (voir [.gitignore](.gitignore)).
Le modèle utilisé est défini par défaut dans [app.py](app.py) (modifiable à cet endroit).