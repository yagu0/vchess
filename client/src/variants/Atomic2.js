import { ChessRules, Move, PiPo } from "@/base_rules";
import { Atomic1Rules } from "@/variants/Atomic1";

export class Atomic2Rules extends Atomic1Rules {

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount == 0) {
      if ([1, 6].includes(x)) {
        const c = this.getColor(x, y);
        return [
          new Move({
            appear: [],
            vanish: [
              new PiPo({ x: x, y: y, p: V.PAWN, c: c })
            ],
            start: { x: x, y: y },
            end: { x: x, y: y }
          })
        ];
      }
      return [];
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  hoverHighlight(x, y) {
    return this.movesCount == 0 && [1, 6].includes(x);
  }

  doClick(square) {
    if (this.movesCount >= 1) return null;
    const [x, y] = [square[0], square[1]];
    if (![1, 6].includes(x)) return null;
    return new Move({
      appear: [],
      vanish: [
        new PiPo({
          x: x,
          y: y,
          c: this.getColor(x, y),
          p: V.PAWN
        })
      ],
      start: { x: x, y: y },
      end: { x: x, y: y }
    });
  }

  getNotation(move) {
    if (move.appear.length == 0 && move.vanish.length == 1)
      // First move in game
      return V.CoordsToSquare(move.start) + "X";
    return super.getNotation(move);
  }

};
