import { ChessRules, PiPo, Move } from "@/base_rules";

export class RifleRules extends ChessRules {

  getBasicMove([sx, sy], [ex, ey], tr) {
    let mv = new Move({
      appear: [],
      vanish: [],
      start: {x:sx, y:sy},
      end: {x:ex, y:ey}
    });
    if (this.board[ex][ey] != V.EMPTY) {
      // No movement: just vanishing enemy piece
      mv.vanish = [
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.getPiece(ex, ey)
        })
      ];
    }
    else {
      // Normal move
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : this.getColor(sx, sy),
          p: tr ? tr.p : this.getPiece(sx, sy)
        })
      ];
      mv.vanish = [
        new PiPo({
          x: sx,
          y: sy,
          c: this.getColor(sx, sy),
          p: this.getPiece(sx, sy)
        })
      ];
    }

    return mv;
  }

  getEnpassantCaptures([x, y], shiftX) {
    let moves = [];
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      let enpassantMove = new Move({
        appear: [],
        vanish: [],
        start: {x:x, y:y},
        end: {x:x+shiftX, y:epSquare.y}
      });
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: "p",
        c: this.getColor(x, epSquare.y)
      });
      moves.push(enpassantMove);
    }
    return moves;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
