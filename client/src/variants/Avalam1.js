import { ChessRules } from "@/base_rules";
import { Avalam2Rules } from "@/variants/Avalam2";

export class Avalam1Rules extends Avalam2Rules {

  static get NOTHING() {
    return "xx";
  }

  static board2fen(b) {
    if (b[0] == 'x') return 'x';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'x') return V.NOTHING;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b[0] == 'x') return "Omega/nothing";
    return "Avalam/" + b;
  }

  static GenRandInitFen() {
    return (
      "xxBbxxxxx/xBbBbxxxx/xbBbBbBxx/xBbBbBbBb/BbBb1bBbB/" +
      "bBbBbBbBx/xxBbBbBbx/xxxxbBbBx/xxxxxbBxx w 0"
    );
  }

  static get size() {
    return { x: 9, y: 9 };
  }

  static OnBoard(x, y) {
    if (!ChessRules.OnBoard(x, y)) return false;
    switch (x) {
      case 0: return [2, 3].includes(y);
      case 1: return [1, 2, 3, 4].includes(y);
      case 2: return [1, 2, 3, 4, 5, 6].includes(y);
      case 3: return y >= 1;
      case 4: return y != 4;
      case 5: return y <= 7;
      case 6: return [2, 3, 4, 5, 6, 7].includes(y);
      case 7: return [4, 5, 6, 7].includes(y);
      case 8: return [5, 6].includes(y);
    }
    return false; //never reached
  }

};
