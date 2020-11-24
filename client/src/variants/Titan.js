import { ChessRules } from "@/base_rules";

export class TitanRules extends ChessRules {
  // Idea: yellow = bishop, orange = knight (for white)
  // and, red = bishop + purple = knight (black side)
  // (avoid using a bigger board, or complicated drawings)

  // Decode if normal piece, or + bishop or knight
  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    if (ChessRules.PIECES.includes(piece)) return piece;
    // Augmented piece:
    switch (piece) {
      case 'a':
      case 'c':
        return 'b';
      case 'j':
      case 'l':
        return 'k';
      case 'm':
      case 'o':
        return 'n';
      case 's':
      case 't':
        return 'q';
      case 'u':
      case 'v':
        return 'r';
    }
  }

  // TODO: subtelty, castle forbidden if 

  // Code: a/c = bishop + knight/bishop j/l for king,
  // m/o for knight, s/t for queen, u/v for rook
  static get AUGMENTED_PIECES() {
    return [
      'a',
      'c',
      'j',
      'l',
      'm',
      'o',
      's',
      't',
      'u',
      'v'
    ];
  }

  // Decode above notation into additional piece
  getExtraPiece(symbol) {
    if (['a','j','m','s','u'].includes(symbol))
      return 'n';
    return 'b';
  }

  // If piece not in usual list, bishop or knight appears.
  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom(sq);
    const color = this.turn;
    
// treat castle case here (both pieces appear!)
    if (
      V.AUGMENTED_PIECES.includes(this.board[x][y][1]) &&
      ((color == 'w' && x == 7) || (color == "b" && x == 0))
    ) {
      const newPiece = this.getExtraPiece(this.board[x][y][1]);
      moves.forEach(m => {
        m.appear.push(
          new PiPo({
            p: newPiece,
            c: color,
            x: x,
            y: y
          })
        );
      });
    }
    return moves;
  }

  // TODO: special case of move 1 = choose squares, knight first, then bishop
  // (just click ?)
};
