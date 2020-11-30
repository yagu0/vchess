import { ChessRules } from "@/base_rules";

export class Knightrelay1Rules extends ChessRules {

  static get HasEnpassant() {
    return false;
  }

  // TODO: IsGoodPosition to check that 2 knights are on the board...

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);

    // Expand possible moves if guarded by a knight, and is not a king:
    const piece = this.getPiece(x,y);
    if (![V.KNIGHT,V.KING].includes(piece)) {
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
        const lastRank = (color == "w" ? 0 : V.size.x - 1);
        for (const step of V.steps[V.KNIGHT]) {
          if (
            V.OnBoard(x+step[0],y+step[1]) &&
            this.getColor(x+step[0],y+step[1]) != color &&
            // Pawns cannot promote by knight-relay
            (piece != V.PAWN || x+step[0] != lastRank)
          ) {
            moves.push(this.getBasicMove([x,y], [x+step[0],y+step[1]]));
          }
        }
      }
    }

    // Forbid captures of knights (invincible in this variant)
    return moves.filter(m => {
      return (
        m.vanish.length == 1 ||
        m.appear.length == 2 ||
        m.vanish[1].p != V.KNIGHT
      );
    });
  }

  getPotentialKnightMoves(sq) {
    // Knights don't capture:
    return super.getPotentialKnightMoves(sq).filter(m => m.vanish.length == 1);
  }

  isAttacked(sq, color) {
    if (super.isAttacked(sq, color)) return true;

    // Check if a (non-knight) piece at knight distance
    // is guarded by a knight (and thus attacking)
    // --> Except for pawns targetting last rank.
    const x = sq[0],
          y = sq[1];
    // Last rank for me, that is to say oppCol of color:
    const lastRank = (color == 'w' ? V.size.x - 1 : 0);
    for (const step of V.steps[V.KNIGHT]) {
      if (
        V.OnBoard(x+step[0],y+step[1]) &&
        this.getColor(x+step[0],y+step[1]) == color
      ) {
        const piece = this.getPiece(x+step[0],y+step[1]);
        if (piece != V.KNIGHT && (piece != V.PAWN || x != lastRank)) {
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
    }

    return false;
  }

  isAttackedByKnight(sq, color) {
    // Knights don't attack
    return false;
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 0, //the knight isn't captured - value doesn't matter
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

    // Since pieces and pawns could move like knight,
    // indicate start and end squares
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
