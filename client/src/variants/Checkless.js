import { ChessRules } from "@/base_rules";

export class ChecklessRules extends ChessRules {

  // Cannot use super.atLeastOneMove: lead to infinite recursion
  atLeastOneMove_aux() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.getColor(i, j) == color) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.length > 0) {
            for (let k = 0; k < moves.length; k++) {
              let res = false;
              this.play(moves[k]);
              res = !this.underCheck(color) && !this.underCheck(oppCol);
              this.undo(moves[k]);
              if (res) return true;
            }
          }
        }
      }
    }
    return false;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    return moves.filter(m => {
      this.play(m);
      // Move shouldn't result in self-check:
      let res = !this.underCheck(color);
      if (res) {
        const checkOpp = this.underCheck(oppCol);
        // If checking the opponent, he shouldn't have any legal move:
        res = !checkOpp || checkOpp && !this.atLeastOneMove_aux();
      }
      this.undo(m);
      return res;
    });
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
