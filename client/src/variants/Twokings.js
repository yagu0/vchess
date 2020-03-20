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
          const num = parseInt(row[i]);
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
  scanKings(fen) {}

  getCheckSquares(color) {
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
    const fen = CoregalRules.GenRandInitFen(randomness);
    return fen.replace("q", "k").replace("Q", "K");
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
