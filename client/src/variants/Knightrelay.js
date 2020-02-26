import { ChessRules } from "@/base_rules";

export const VariantRules = class KnightrelayRules extends ChessRules {
  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);

    // Expand possible moves if guarded by a knight:
    if (this.getPiece(x,y) != V.KNIGHT) {
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
        for (const step of V.steps[V.KNIGHT]) {
          if (
            V.OnBoard(x+step[0],y+step[1]) &&
            this.getColor(x+step[0],y+step[1]) != color
          ) {
            let m = this.getBasicMove([x,y], [x+step[0],y+step[1]]);
            if (!m.appear[0].c || !m.vanish[0].c)
              debugger;
            moves.push(m);
            //moves.push(this.getBasicMove([x,y], [x+step[0],y+step[1]]));
          }
        }
      }
    }

    return moves;
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
