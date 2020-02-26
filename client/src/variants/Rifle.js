import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class RifleRules extends ChessRules {
  static get HasEnpassant() {
    // Due to the capturing mode, en passant is disabled
    return false;
  }

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
};
