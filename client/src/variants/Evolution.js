import { ChessRules } from "@/base_rules";

export class EvolutionRules extends ChessRules {

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    const c = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    if (
      [V.BISHOP, V.ROOK, V.QUEEN].includes(piece) &&
      (c == 'w' && x == 7) || (c == 'b' && x == 0)
    ) {
      // Move from first rank
      const forward = (c == 'w' ? -1 : 1);
      for (let shift of [-2, 0, 2]) {
        if (
          (piece == V.ROOK && shift != 0) ||
          (piece == V.BISHOP && shift == 0)
        ) {
          continue;
        }
        if (
          V.OnBoard(x+2*forward, y+shift) &&
          this.board[x+forward][y+shift/2] != V.EMPTY &&
          this.getColor(x+2*forward, y+shift) != c
        ) {
          moves.push(this.getBasicMove([x,y], [x+2*forward,y+shift]));
        }
      }
    }
    return moves;
  }

};
