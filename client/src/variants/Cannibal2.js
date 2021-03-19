import { Cannibal1Rules } from "@/variants/Cannibal1";

export class Cannibal2Rules extends Cannibal1Rules {

  // Trim all non-capturing moves
  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length == 2 && m.appear.length == 1);
  }

  // Stop at the first capture found (if any)
  atLeastOneCapture() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) != oppCol &&
          this.filterValid(this.getPotentialMovesFrom([i, j])).some(m =>
            // Warning: discard castle moves
            m.vanish.length == 2 && m.appear.length == 1)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  addPawnMoves([x1, y1], [x2, y2], moves) {
    let finalPieces = [V.PAWN];
    const color = this.turn;
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    if (x2 == lastRank) {
      if (this.board[x2][y2] != V.EMPTY)
        // Cannibal rules: no choice if capture
        finalPieces = [this.getPiece(x2, y2)];
      else finalPieces = V.PawnSpecs.promotions;
    }
    let tr = null;
    for (let piece of finalPieces) {
      tr = (piece != V.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  getPossibleMovesFrom(sq) {
    let moves = this.filterValid(this.getPotentialMovesFrom(sq));
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  getAllValidMoves() {
    const moves = super.getAllValidMoves();
    if (moves.some(m => m.vanish.length == 2 && m.appear.length == 1))
      return V.KeepCaptures(moves);
    return moves;
  }

};
