import { ChessRules } from "@/base_rules";
import { CoregalRules } from "@/variants/Coregal";

export class TwokingsRules extends CoregalRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: ChessRules.PawnSpecs.promotions.concat([V.KING]) }
    );
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "w": 0, "b": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Two kings (at least) per side should be present:
    if (Object.values(kings).some(v => v < 2)) return false;
    return true;
  }

  // Not scanning king positions. In this variant, scan the board everytime.
  scanKings() {}

  getCheckSquares() {
    const color = this.turn;
    let squares = [];
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.KING &&
          this.isAttacked([i, j], oppCol)
        ) {
          squares.push([i, j]);
        }
      }
    }
    return squares;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnqkkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNQKKBNR w 0 adehadeh -";

    const replaceBishop = (fen, first, ch1, ch2) => {
      // Remove and re-add final part:
      const suffix = fen.substr(-15);
      fen = fen.slice(0, -15);
      if (first) fen = fen.replace(ch1, ch2);
      else {
        fen =
          fen.split("").reverse().join("")
          .replace(ch1, ch2)
          .split("").reverse().join("")
      }
      return fen + suffix;
    };

    const sameIndexReplace = (fen) => {
      const first = (Math.random() < 0.5);
      return replaceBishop(
        replaceBishop(fen, first, 'B', 'Q'),
        first,
        'b',
        'q'
      );
    };

    const fen =
      CoregalRules.GenRandInitFen(randomness)
      .replace("q", "k").replace("Q", "K");
    // Now replace a bishop by the queen,
    // so that bishops are of different colors:
    if (randomness == 1) return sameIndexReplace(fen);
    const wOdd = fen.indexOf('B') % 2;
    const bOdd = fen.indexOf('b') % 2;
    // Since there are 7 slashes, different oddities means symmetric
    if (wOdd != bOdd) return sameIndexReplace(fen);
    const wFirst = (Math.random() < 0.5);
    return replaceBishop(
      replaceBishop(fen, wFirst, 'B', 'Q'),
      !wFirst,
      'b',
      'q'
    );
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.KING &&
          this.isAttacked([i, j], oppCol)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  postPlay(move) {
    const piece = move.vanish[0].p;
    super.updateCastleFlags(move, piece, "twoKings");
  }

  postUndo() {}
};
