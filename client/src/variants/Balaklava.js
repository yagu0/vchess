import { ChessRules } from "@/base_rules";

export class BalaklavaRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.ROOK, V.MAMMOTH, V.BISHOP, V.QUEEN] }
    );
  }

  static get HasEnpassant() {
    return false;
  }

  getPpath(b) {
    return (b[1] == V.MAMMOTH ? "Balaklava/" : "") + b;
  }

  // Alfil + Dabbaba:
  static get MAMMOTH() {
    return "m";
  }

  static get PIECES() {
    return [V.PAWN, V.ROOK, V.MAMMOTH, V.BISHOP, V.QUEEN, V.KING];
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        m: [
          [-2, -2],
          [-2, 0],
          [-2, 2],
          [0, -2],
          [0, 2],
          [2, -2],
          [2, 0],
          [2, 2],
        ]
      }
    );
  }

  static GenRandInitFen(randomness) {
    // No collision between 'n' and castle flags, so next replacement is fine
    return (
      ChessRules.GenRandInitFen(randomness)
        .replace(/n/g, 'm').replace(/N/g, 'M')
    );
  }

  getPotentialMovesFrom([x, y]) {
    const piece = this.getPiece(x, y);
    let moves =
      piece == V.MAMMOTH
        ? this.getPotentialMammothMoves([x, y])
        : super.getPotentialMovesFrom([x, y]);
    if (piece != V.KING) {
      // Add non-capturing knight movements
      const lastRank = (this.turn == 'w' ? 0 : 7);
      V.steps[V.KNIGHT].forEach(step => {
        const [i, j] = [x + step[0], y + step[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] == V.EMPTY &&
          // Pawns don't promote with a knight move
          (piece != V.PAWN || i != lastRank)
        ) {
          moves.push(this.getBasicMove([x, y], [i, j]));
        }
      });
    }
    return moves;
  }

  getPotentialMammothMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.MAMMOTH], "oneStep");
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByMammoth(sq, color)
    );
  }

  isAttackedByMammoth(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.MAMMOTH, V.steps[V.MAMMOTH], "oneStep")
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return Object.assign(
      // A mammoth is probably worth a little more than a knight
      { m: 4 },
      ChessRules.VALUES
    );
  }
};
