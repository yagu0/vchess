import { ChessRules } from "@/base_rules";

export class AntimatterRules extends ChessRules {
  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);

    // Handle "matter collisions"
    moves.forEach(m => {
      if (
        m.vanish.length > 1 &&
        m.appear.length <= 1 &&
        m.vanish[0].p == m.vanish[1].p
      ) {
        m.appear.pop();
      }
    });

    return moves;
  }
};
