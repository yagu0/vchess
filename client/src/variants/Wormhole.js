import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

// TODO:
// Short-range pieces:
// rook 1 or 2 squares orthogonal
// bishop 1 or 2 diagonal
// queen = bishop + rook
// knight: one square orthogonal + 1 diagonal (only acepted desc)
// no castle or en passant. Promotion possible only by capture (otherwise hole)

export const VariantRules = class WormholeRules extends ChessRules {
  // TODO: redefine pieces movements, taking care of holes (auxiliary func: getSquareAfter(shiftX,shiftY))
  // this aux func could return null / undefined
  // revoir getPotentialMoves et isAttacked : tout ce qui touche au board avec calcul,
  // car les "board[x+..][y+..]" deviennent des board[getSquareAfter...]
  // Special FEN sign for holes: 'x'

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  getSquareAfter(sq, shift) {
    // TODO
  }

  getPpath(b) {
    if (b.indexOf('x') >= 0)
      return "Wormhole/hole.svg";
    return b;
  }

  // TODO: postUpdateVars: board[start] = "xx"; --> V.HOLE

  updateVariables(move) {
    super.updateVariables(move);
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
  }

  getNotation(move) {
    const piece = this.getPiece(move.start.x, move.start.y);
    // Indicate start square + dest square, because holes distort the board
    let notation =
      piece.toUpperCase() +
      V.CoordsToSquare(move.start) +
      (move.vanish.length > move.appear.length ? "x" : "") +
      V.CoordsToSquare(move.end);
    if (piece == V.PAWN && move.appear[0].p != V.PAWN)
      // Promotion
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }
};
