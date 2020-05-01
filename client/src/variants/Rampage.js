import { ChessRules } from "@/base_rules";

// Plan : garder intact isAttacked,
// ajouter "guarded" qui somme les attaques blanches et soustrait les attaques noires sur une case
// (regarder toutes directions, OK)
// --> boulot à faire sur chaque case vide, après chaque getPotentialMoves()
// --> sauf si le roi est en échec (avant de jouer).

export class RampageRules extends ChessRules {
};
