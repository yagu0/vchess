import { ChessRules } from "@/base_rules";

export class Knightrelay2Rules extends ChessRules {
  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);

    // Expand possible moves if guarded by a knight:
    const piece = this.getPiece(x,y);
    if (piece != V.KNIGHT) {
      const color = this.turn;
      let guardedByKnight = false;
      for (const step of V.steps[V.KNIGHT]) {
        if (
          V.OnBoard(x+step[0],y+step[1]) &&
          this.getPiece(x+step[0],y+step[1]) == V.KNIGHT &&
          this.getColor(x+step[0],y+step[1]) == color
        ) {
          guardedByKnight = true;
          break;
        }
      }
      if (guardedByKnight) {
        const lastRank = color == "w" ? 0 : V.size.x - 1;
        for (const step of V.steps[V.KNIGHT]) {
          if (
            V.OnBoard(x+step[0],y+step[1]) &&
            this.getColor(x+step[0],y+step[1]) != color
          ) {
            // Potential promotions:
            const finalPieces = piece == V.PAWN && x + step[0] == lastRank
              ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
              : [piece];
            for (let p of finalPieces) {
              moves.push(
                this.getBasicMove([x,y], [x+step[0],y+step[1]], {
                  c: color,
                  p: p
                })
              );
            }
          }
        }
      }
    }

    return moves;
  }

  isAttacked(sq, color) {
    if (super.isAttacked(sq, color)) return true;

    // Check if a (non-knight) piece at knight distance
    // is guarded by a knight (and thus attacking)
    const x = sq[0],
          y = sq[1];
    for (const step of V.steps[V.KNIGHT]) {
      if (
        V.OnBoard(x+step[0],y+step[1]) &&
        this.getColor(x+step[0],y+step[1]) == color &&
        this.getPiece(x+step[0],y+step[1]) != V.KNIGHT
      ) {
        for (const step2 of V.steps[V.KNIGHT]) {
          const xx = x+step[0]+step2[0],
                yy = y+step[1]+step2[1];
          if (
            V.OnBoard(xx,yy) &&
            this.getColor(xx,yy) == color &&
            this.getPiece(xx,yy) == V.KNIGHT
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 7, //the knight is valuable
      b: 3,
      q: 9,
      k: 1000
    };
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    if (move.appear.length == 2 && move.appear[0].p == V.KING)
      // Castle
      return move.end.y < move.start.y ? "0-0-0" : "0-0";

    // Translate final and initial square
    const initSquare = V.CoordsToSquare(move.start);
    const finalSquare = V.CoordsToSquare(move.end);
    const piece = this.getPiece(move.start.x, move.start.y);

    // Since pieces and pawns could move like knight, indicate start and end squares
    let notation =
      piece.toUpperCase() +
      initSquare +
      (move.vanish.length > move.appear.length ? "x" : "") +
      finalSquare

    if (
      piece == V.PAWN &&
      move.appear.length > 0 &&
      move.appear[0].p != V.PAWN
    ) {
      // Promotion
      notation += "=" + move.appear[0].p.toUpperCase();
    }

    return notation;
  }
};
