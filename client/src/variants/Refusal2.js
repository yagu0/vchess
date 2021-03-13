import { Refusal1Rules } from "@/variants/Refusal1";

export class Refusal2Rules extends Refusal1Rules {

  // NOTE: do not take refusal move into account here (two own moves)
  atLeastTwoMoves() {
    let movesCounter = 0;
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          const moves = this.getPotentialMovesFrom([i, j]);
          for (let m of moves) {
            if (m.vanish[0].c == color && this.filterValid([m]).length > 0) {
              movesCounter++;
              if (movesCounter >= 2) return true;
            }
          }
        }
      }
    }
    return false;
  }

  prePlay(move) {
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    if (
      // My previous move was already refused?
      (!!lm && this.getColor(lm.end.x, lm.end.y) == this.turn) ||
      // I've only one move available?
      !this.atLeastTwoMoves()
    ) {
      move.noRef = true;
    }
    // NOTE: refusal could be recomputed, but, it's easier like this
    if (move.vanish[0].c != this.turn) move.refusal = true;
  }

};
