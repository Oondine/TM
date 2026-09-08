// Logique du jeu côté navigateur : enchaîne les tours, affiche les questions du
// modèle et tient l'historique des parties.

// État de la partie.
let historique = [];        // toutes les questions posées et leurs réponses
let questionEnCours = null; // la question actuellement affichée
let devinetteEnCours = null; // la devinette actuellement affichée

// Raccourcis vers les éléments de la page.
const etiquette = document.getElementById("etiquette");
const scene = document.getElementById("scene");
const boutonsReponse = document.getElementById("reponses");
const boutonsDevinette = document.getElementById("devinette");
const boutonDepart = document.getElementById("depart");
const boutonAbandon = document.getElementById("abandon");
const journal = document.getElementById("journal");
const listeHistorique = document.getElementById("historique");

// Cache tous les groupes de boutons.
function cacherBoutons() {
  boutonsReponse.hidden = true;
  boutonsDevinette.hidden = true;
  boutonDepart.hidden = true;
  boutonAbandon.hidden = true;
}

// Démarre (ou relance) une partie.
function nouvellePartie() {
  historique = [];
  tourSuivant();
}

// Joue un tour : envoie l'historique au serveur et affiche sa réponse.
async function tourSuivant() {
  cacherBoutons();
  etiquette.textContent = "";
  scene.textContent = "Je réfléchis…";

  const r = await fetch("/api/tour", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ historique }),
  });
  const donnees = await r.json();

  // Affiche la réponse brute du serveur, pour suivre le déroulé du jeu.
  journal.textContent = "Réponse du serveur : " + JSON.stringify(donnees, null, 2) + "\n\n"
                      + "Historique : " + JSON.stringify(historique, null, 2);

  if (donnees.type === "devinette") {
    // Le modèle propose une réponse : boutons « gagné » / « continue ».
    devinetteEnCours = donnees.texte;
    etiquette.textContent = "Devinette";
    scene.textContent = donnees.texte + " ?";
    boutonsDevinette.hidden = false;
  } else {
    // Le modèle pose une question : on montre les 5 boutons de réponse.
    questionEnCours = donnees.texte;
    etiquette.textContent = "Question " + nombreDeCoups();
    scene.textContent = donnees.texte;
    boutonsReponse.hidden = false;
  }
  // L'abandon reste possible à tout moment de la partie.
  boutonAbandon.hidden = false;
}

// Nombre de coups joués : chaque entrée d'historique correspond à un coup
// déjà répondu, plus le coup actuellement affiché à l'écran.
function nombreDeCoups() {
  return historique.length + 1;
}

// Envoie la partie terminée au serveur, qui l'enregistre en base, puis
// rafraîchit la liste affichée en bas de page.
async function enregistrerPartie(trouve, reponse) {
  await fetch("/api/partie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trouve, reponse, coups: nombreDeCoups() }),
  });
  await chargerHistorique();
}

// L'utilisateur répond à une question, puis on enchaîne le tour suivant.
function repondre(reponse) {
  historique.push({ question: questionEnCours, reponse: reponse });
  tourSuivant();
}

// Devinette acceptée : la partie est gagnée, on l'enregistre.
function gagne() {
  cacherBoutons();
  etiquette.textContent = "Résultat";
  scene.textContent = "Gagné en " + nombreDeCoups() + " coups !";
  boutonDepart.hidden = false;
  enregistrerPartie(true, devinetteEnCours);
}

// L'utilisateur déclare que le modèle ne trouvera pas : on lui demande la
// réponse pour pouvoir l'enregistrer, puis la partie est perdue.
function abandonner() {
  const reponse = prompt("À quoi pensais-tu ?");
  if (!reponse) return; // annulé ou vide : on ne fait rien, la partie continue
  cacherBoutons();
  etiquette.textContent = "Résultat";
  scene.textContent = "Perdu ! C'était : " + reponse;
  boutonDepart.hidden = false;
  enregistrerPartie(false, reponse);
}

// Devinette refusée : on le signale au modèle et on continue à jouer.
function refuser() {
  historique.push({
    question: "Ma devinette : " + devinetteEnCours,
    reponse: 'Non, ce n\'est pas "' + devinetteEnCours + '". Reprends une question discriminante.',
  });
  tourSuivant();
}

// Petite fabrique de <span> : évite de répéter les trois mêmes lignes pour
// chaque morceau d'une ligne d'historique.
function morceau(classe, texte) {
  const span = document.createElement("span");
  span.className = classe;
  // textContent (et non innerHTML) : la réponse vient de l'utilisateur ou
  // du modèle, on l'affiche donc comme du texte brut, jamais comme du HTML.
  span.textContent = texte;
  return span;
}

// Récupère l'historique en base et l'affiche sous forme de liste.
async function chargerHistorique() {
  const r = await fetch("/api/historique");
  const parties = await r.json();

  listeHistorique.textContent = ""; // on repart d'une liste vide

  if (parties.length === 0) {
    const vide = document.createElement("li");
    vide.className = "vide";
    vide.textContent = "Pas encore de devinettes";
    listeHistorique.appendChild(vide);
    return;
  }

  for (const partie of parties) {
    // Une ligne = quatre morceaux, pour pouvoir les habiller séparément en CSS.
    const ligne = document.createElement("li");
    ligne.append(
      morceau(partie.trouve ? "badge trouve" : "badge perdu",
              partie.trouve ? "trouvé" : "non trouvé"),
      morceau("reponse", partie.reponse),
      morceau("date", partie.date),
      morceau("coups", partie.coups + " coups"),
    );
    listeHistorique.appendChild(ligne);
  }
}

// Vide la table côté serveur, puis rafraîchit l'affichage.
async function effacerHistorique() {
  await fetch("/api/historique", { method: "DELETE" });
  await chargerHistorique();
}

// Au chargement de la page, on affiche l'historique existant.
chargerHistorique();
