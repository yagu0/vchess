import { ChessRules } from "@/base_rules";

export class SynchroneRules extends ChessRules {
  // TODO: getNotation retourne "?" si turn == "w"
  // ==> byrows disparait, juste "showAll" et "None".
  //
  // play: si turn == "w", enregistrer le coup (whiteMove),
  // mais ne rien faire ==> résolution après le coup noir.
  //
  // ==> un coup sur deux (coups blancs) est "vide" du point de vue de l'exécution.
};
