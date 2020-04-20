import { ChessRules } from "@/base_rules";
import { BerolinaRules } from "@/variants/Berolina";

export class GridolinaRules extends BerolinaRules {
  static get Lines() {
    return [
      [[2, 0], [2, 8]],
      [[4, 0], [4, 8]],
      [[6, 0], [6, 8]],
      [[0, 2], [8, 2]],
      [[0, 4], [8, 4]],
      [[0, 6], [8, 6]]
    ];
  }

  static OnDifferentGrids([x1, y1], [x2, y2]) {
    return (
        Math.abs(Math.floor(x1 / 2) - Math.floor(x2 / 2)) >= 1 ||
        Math.abs(Math.floor(y1 / 2) - Math.floor(y2 / 2)) >= 1
    );
  }

  canTake([x1, y1], [x2, y2]) {
    return (
      V.OnDifferentGrids([x1, y1], [x2, y2]) &&
      super.canTake([x1, y1], [x2, y2])
    );
  }

  getPotentialMovesFrom([x, y]) {
    return (
      super.getPotentialMovesFrom([x, y]).filter(m => {
        return V.OnDifferentGrids([x, y], [m.end.x, m.end.y]);
      })
    );
  }
};
