import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";

export const VariantRules = class CircularRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  // TODO: CanFlip --> also for racing kings (answer is false)

  // TODO: shuffle on 1st and 5th ranks
  static GenRandInitFen() {
    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on first and last rank
    for (let c of ["w", "b"]) {
      let positions = ArrayFun.range(8);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks and king positions are now fixed,
      // because of the ordering rook-king-rook
      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0"
    );
  }

  // TODO: adapt this for a circular board
  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep !== undefined) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  // TODO: adapt: all pawns go in thz same direction!
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const firstRank = color == "w" ? sizeX - 1 : 0;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;
    const pawnColor = this.getColor(x, y); //can be different for checkered

    // NOTE: next condition is generally true (no pawn on last rank)
    if (x + shiftX >= 0 && x + shiftX < sizeX) {
      const finalPieces =
        x + shiftX == lastRank
          ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
          : [V.PAWN];
      // One square forward
      if (this.board[x + shiftX][y] == V.EMPTY) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y], {
              c: pawnColor,
              p: piece
            })
          );
        }
        // Next condition because pawns on 1st rank can generally jump
        if (
          [startRank, firstRank].includes(x) &&
          this.board[x + 2 * shiftX][y] == V.EMPTY
        ) {
          // Two squares jump
          moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
        }
      }
      // Captures
      for (let shiftY of [-1, 1]) {
        if (
          y + shiftY >= 0 &&
          y + shiftY < sizeY &&
          this.board[x + shiftX][y + shiftY] != V.EMPTY &&
          this.canTake([x, y], [x + shiftX, y + shiftY])
        ) {
          for (let piece of finalPieces) {
            moves.push(
              this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
                c: pawnColor,
                p: piece
              })
            );
          }
        }
      }
    }

    return moves;
  }

  // What are the king moves from square x,y ?
  getPotentialKingMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  // TODO: check boundaries here as well
  isAttackedByPawn([x, y], colors) {
    for (let c of colors) {
      let pawnShift = c == "w" ? 1 : -1;
      if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
        for (let i of [-1, 1]) {
          if (
            y + i >= 0 &&
            y + i < V.size.y &&
            this.getPiece(x + pawnShift, y + i) == V.PAWN &&
            this.getColor(x + pawnShift, y + i) == c
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // TODO: adapt this function
  isAttackedBySlideNJump([x, y], colors, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) === piece &&
        colors.includes(this.getColor(rx, ry))
      ) {
        return true;
      }
    }
    return false;
  }
};
