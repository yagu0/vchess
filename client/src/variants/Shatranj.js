import { ChessRules } from "@/base_rules";

export class ShatranjRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  static get Notoodark() {
    return true;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        twoSquares: false,
        promotions: [V.QUEEN]
      }
    );
  }

  getPpath(b) {
    if (b[1] == 'b') return "Shatranj/" + b;
    return b;
  }

  static get ElephantSteps() {
    return [
      [-2, -2],
      [-2, 2],
      [2, -2],
      [2, 2]
    ];
  }

  static GenRandInitFen(randomness) {
    // Remove castle flags and en-passant indication
    return ChessRules.GenRandInitFen(randomness).slice(0, -7);
  }

  getPotentialBishopMoves(sq) {
    let moves = this.getSlideNJumpMoves(sq, V.ElephantSteps, "oneStep");
    // Complete with "repositioning moves": like a queen, without capture
    let repositioningMoves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP],
      "oneStep"
    ).filter(m => m.vanish.length == 1);
    return moves.concat(repositioningMoves);
  }

  getPotentialQueenMoves(sq) {
    // Diagonal capturing moves
    let captures = this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP],
      "oneStep"
    ).filter(m => m.vanish.length == 2);
    return captures.concat(
      // Orthogonal non-capturing moves
      this.getSlideNJumpMoves(
        sq,
        V.steps[V.ROOK],
        "oneStep"
      ).filter(m => m.vanish.length == 1)
    );
  }

  isAttackedByBishop(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.BISHOP,
      V.ElephantSteps,
      "oneStep"
    );
  }

  isAttackedByQueen(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.QUEEN,
      V.steps[V.BISHOP],
      "oneStep"
    );
  }

  getCurrentScore() {
    const color = this.turn;
    const getScoreLost = () => {
      // Result if I lose:
      return color == "w" ? "0-1" : "1-0";
    };
    if (!this.atLeastOneMove())
      // No valid move: I lose (this includes checkmate)
      return getScoreLost();
    // Win if the opponent has no pieces left (except king),
    // and cannot bare king on the next move.
    let piecesLeft = {
      // No need to remember all pieces' squares:
      // variable only used if just one remaining piece.
      "w": {count: 0, square: null},
      "b": {count: 0, square: null}
    };
    outerLoop: for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getPiece(i,j) != V.KING) {
          const sqCol = this.getColor(i,j);
          piecesLeft[sqCol].count++;
          piecesLeft[sqCol].square = [i,j];
        }
      }
    }
    if (Object.values(piecesLeft).every(v => v.count > 0))
      return "*";
    // No pieces left for some side: if both kings are bare, it's a draw
    if (Object.values(piecesLeft).every(v => v.count == 0))
      return "1/2";
    if (piecesLeft[color].count > 0)
      // He could have drawn, but didn't take my last piece...
      return color == "w" ? "1-0" : "0-1";
    const oppCol = V.GetOppCol(color);
    if (piecesLeft[oppCol].count >= 2)
      // 2 enemy units or more: I lose
      return getScoreLost();
    // I don't have any piece, my opponent have one: can I take it?
    if (this.isAttacked(piecesLeft[oppCol].square, color))
      // Yes! But I still need to take it
      return "*";
    // No :(
    return getScoreLost();
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 3,
      k: 1000
    };
  }

};
