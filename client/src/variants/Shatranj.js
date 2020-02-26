// TODO: bishop OK, but queen should move vertical/horizontal and capture diagonally.
// ==> then the pawn promotion is a real promotion (enhancement).

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

  static GenRandInitFen() {
    return ChessRules.GenRandInitFen().replace("w 1111 -", "w");
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
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP],
      "oneStep"
    );
  }

  getPotentialKingMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttackedByBishop(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.BISHOP,
      V.ElephantSteps,
      "oneStep"
    );
  }

  isAttackedByQueen(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.QUEEN,
      V.steps[V.BISHOP],
      "oneStep"
    );
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 2.5,
      q: 2,
      k: 1000
    };
  }
};
