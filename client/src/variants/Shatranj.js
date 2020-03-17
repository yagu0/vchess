import { ChessRules } from "@/base_rules";

export const VariantRules = class ShatranjRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
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

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;
    // Promotion in minister (queen) only:
    const finalPiece = x + shiftX == lastRank ? V.QUEEN : V.PAWN;

    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      moves.push(
        this.getBasicMove([x, y], [x + shiftX, y], {
          c: color,
          p: finalPiece
        })
      );
    }
    // Captures
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        this.canTake([x, y], [x + shiftX, y + shiftY])
      ) {
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
            c: color,
            p: finalPiece
          })
        );
      }
    }

    return moves;
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

  getPotentialKingMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
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
