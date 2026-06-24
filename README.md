# Akinator-LLM

Un Akinator minimaliste qui exploite un LLM. Tu penses à quelque chose (personnage, objet, animal, lieu, concept), le modèle pose des questions et tente de deviner.

## Fonctionnement

- Backend Flask ([app.py](app.py)) qui relaie les tours de jeu vers [OpenRouter](https://openrouter.ai/).
- Frontend HTML/JS unique ([index.html](index.html)), sans CSS, avec 5 réponses possibles : *Oui, Non, Souvent, Parfois, Je ne sais pas*.
- Le prompt système impose une stratégie de **dichotomie** sur les candidats restants (pas de simple énumération).

## Lancer

Prérequis : [uv](https://docs.astral.sh/uv/) installé.

Copie le modèle de configuration et renseigne ta clé [OpenRouter](https://openrouter.ai/keys) :

```sh
cp .env.example .env
# puis édite .env pour y coller ta clé
```

Lance le serveur (le script lit le `.env` tout seul) :

```sh
uv run app.py
```

Puis ouvre <http://localhost:5001>.

Ta clé n'est jamais committée : `.env` est ignoré par git (voir [.gitignore](.gitignore)).
Le modèle utilisé est défini par défaut dans [app.py](app.py) (modifiable à cet endroit).