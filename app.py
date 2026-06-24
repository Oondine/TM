# /// script
# requires-python = ">=3.11"
# dependencies = ["flask", "openrouter==0.9.1", "python-dotenv"]
# ///
# Métadonnées PEP 723 : `uv run app.py` installe les dépendances dans un
# environnement isolé, sans requirements.txt ni venv à gérer.
import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from openrouter import OpenRouter

# Charge les variables du fichier .env (dont OPENROUTER_API_KEY).
load_dotenv()

# Crée le client OpenRouter (la clé est lue depuis OPENROUTER_API_KEY).
client = OpenRouter(api_key=os.environ["OPENROUTER_API_KEY"])

# Choix du modèle.
MODELE = "z-ai/glm-5.2:nitro"   #"deepseek/deepseek-v4-flash:nitro" nitro choisi le provider le plus rapide

# Le prompt système est le moteur du jeu : toute la logique est ici, pas dans le code Python.
PROMPT_SYSTEME = """L'utilisateur pense à quelque chose (personnage réel ou fictif, objet, animal, lieu, concept).
Ton but : le deviner en posant le moins de questions possible.

MÉTHODE OBLIGATOIRE — dichotomie sur un ensemble de candidats :
- À chaque tour, garde la liste des candidats encore compatibles avec TOUTES les réponses données.
- Chaque question doit séparer cet ensemble en deux moitiés à peu près égales (taille, époque, pays, couleur, habitat, fonction, genre, etc.).
- Ne propose une devinette QUE lorsqu'un seul candidat domine clairement le reste.

INTERDICTIONS ABSOLUES :
- NE JAMAIS deviner par énumération. Exemple à bannir : si tu penses à un grand félin, ne propose pas "Lion ?", puis "Tigre ?", puis "Lynx ?". Pose plutôt une question qui les distingue (taille, taches, oreilles à pinceaux, habitat, continent…).
- Après une devinette refusée, NE PAS proposer un candidat similaire au hasard. Reprends des questions discriminantes pour départager les candidats restants.
- Si l'utilisateur a répondu "Je ne sais pas" deux fois de suite sur un même critère (origine géographique, époque, taille, couleur, etc.), ABANDONNE ce critère et passe à un axe complètement différent. NE PAS énumérer toutes les valeurs possibles de ce critère (continents, siècles, gammes de tailles…) — c'est de l'énumération déguisée.
- Ne pose jamais une question dont la réponse est déjà déductible des réponses précédentes.

RÈGLES DE FORME :
1. UNE seule question à la fois, fermée. L'utilisateur peut répondre uniquement par : Oui, Non, Souvent, Parfois, Je ne sais pas.
   - "Souvent" = vrai dans la majorité des cas / variantes (ex. un lynx a souvent des taches).
   - "Parfois" = vrai pour une minorité de cas / variantes (ex. un lynx a parfois la queue entièrement noire).
   - "Je ne sais pas" = l'utilisateur ignore la réponse.
   Tiens-en compte : un "Souvent" ou "Parfois" t'indique que le critère est variable selon la sous-espèce / variante / contexte — ne traite pas ces réponses comme un "Oui" ferme.
2. Format de sortie OBLIGATOIRE, une seule ligne, rien d'autre :
   - Pour une question : `QUESTION: <ta question>`
   - Pour une devinette : `DEVINETTE: <ta réponse>`
3. Pas de préambule, pas d'explication, pas de markdown."""

# Crée l'application Flask.
app = Flask(__name__)


# Page d'accueil : sert le fichier index.html tel quel.
@app.get("/")
def accueil():
    return send_file("index.html")


# Un tour de jeu : reçoit l'historique, interroge le modèle, renvoie sa réponse.
@app.post("/api/tour")
def tour():
    # Serveur sans mémoire : le navigateur renvoie tout l'historique à chaque tour.
    donnees = request.get_json()
    historique = donnees.get("historique", [])

    # On reconstruit la conversation au format attendu par OpenRouter : les
    # questions du modèle ont le rôle "assistant", les réponses de l'utilisateur
    # le rôle "user" (ces noms de rôles sont imposés par l'API).
    messages = [{"role": "system", "content": PROMPT_SYSTEME}]
    for echange in historique:
        messages.append({"role": "assistant", "content": echange["question"]})
        messages.append({"role": "user", "content": echange["reponse"]})
    if not historique:
        # Au tout début, on envoie un message pour amorcer la partie.
        messages.append({"role": "user", "content": "Commence."})

    # On interroge le modèle. Température basse = réponses stables, peu créatives.
    reponse = client.chat.send(model=MODELE, messages=messages, temperature=0.3)

    # Le modèle répond sur une seule ligne, préfixée par « QUESTION: » ou
    # « DEVINETTE: » (imposé par le prompt système). On renvoie ça en JSON.
    texte = reponse.choices[0].message.content.strip()
    if texte.upper().startswith("DEVINETTE:"):
        return jsonify(type="devinette", texte=texte[10:].strip())
    if texte.upper().startswith("QUESTION:"):
        return jsonify(type="question", texte=texte[9:].strip())
    # Filet de sécurité : si le format n'est pas respecté, on traite comme une question.
    return jsonify(type="question", texte=texte)


# Port 5001 : rarement déjà utilisé.
app.run(port=5001, debug=True)
