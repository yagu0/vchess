import { ChessRules } from "@/base_rules";

export class TitanRules extends ChessRules {
  // Idea: yellow = bishop, orange = knight (for white)
  // and, red = bishop + purple = knight (black side)
  // (avoid using a bigger board, or complicated drawings)

  // TODO: decode if piece + bishop or knight
  getPiece() {}

  // Code: a/c = bishop + knight/bishop j/l for king,
  // m/o for knight, s/t for queen, u/v for rook
  static get AUGMENTED_PIECES() {
    return {
      // ...
    };
  }
  // or:
  getExtraPiece(symbol) {
    // TODO: switch ... case ... return b or n
  }

  // TODO: hook after any move from 1st rank,
  // if piece not in usual list, bishop or knight appears.
  getPotentialMovesFrom(sq) {
    let moves = super.getPotentialMovesFrom(sq);
    const color = this.turn;
    if (
      !ChessRules.PIECES.includes(this.board[sq[0]][sq[1]][1]) &&
      ((color == 'w' && sq[0] == 7) || (color == "b" && sq[0] == 0))
    ) {
      // (or lookup table)
      const newPiece = this.getExtraPiece(this.board[sq[0]][sq[1]][1])
      moves.forEach(m => {
        m.appear.push(
          new PiPo({
            p: newPiece,
            c: color,
            x: sq[0],
            y: sq[1]
          })
        );
      });
    }
    return moves;
  }

  // TODO: special case of move 1 = choose squares, knight first, then bishop
  // (just click ?)
};
