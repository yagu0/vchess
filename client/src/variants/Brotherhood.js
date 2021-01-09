import { ChessRules } from "@/base_rules";

export class BrotherhoodRules extends ChessRules {

  getPotentialMovesFrom([x, y]) {
    return (
      super.getPotentialMovesFrom([x, y]).filter(m => {
        // Forbid capturing same piece's type:
        return (
          m.vanish.length == 1 ||
          [V.PAWN, V.KING].includes(m.vanish[0].p) ||
          m.vanish[1].p != m.vanish[0].p
        );
      })
    );
  }

  getCurrentScore() {
    if (this.atLeastOneMove()) return "*";
    // Game over
    return (this.turn == "w" ? "0-1" : "1-0");
  }

};
