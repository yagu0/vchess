import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";

export class CylinderRules extends ChessRules {
  // Output basically x % 8 (circular board)
  static ComputeY(y) {
    let res = y % V.size.y;
    if (res < 0)
      res += V.size.y;
    return res;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = V.ComputeY(y + step[1]);
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep !== undefined) continue outerLoop;
        i += step[0];
        j = V.ComputeY(j + step[1]);
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;

    const finalPieces =
      x + shiftX == lastRank
        ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
        : [V.PAWN];
    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      for (let piece of finalPieces) {
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], {
            c: color,
            p: piece
          })
        );
      }
      if (
        x == startRank &&
        this.board[x + 2 * shiftX][y] == V.EMPTY
      ) {
        // Two squares jump
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    // Captures
    for (let shiftY of [-1, 1]) {
      const nextFile = V.ComputeY(y + shiftY);
      if (
        this.board[x + shiftX][nextFile] != V.EMPTY &&
        this.canTake([x, y], [x + shiftX, nextFile])
      ) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, nextFile], {
              c: color,
              p: piece
            })
          );
        }
      }
    }

    // En passant
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs( (epSquare.y - y) % V.size.y ) == 1
    ) {
      let enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: "p",
        c: this.getColor(x, epSquare.y)
      });
      moves.push(enpassantMove);
    }

    return moves;
  }

  isAttackedByPawn([x, y], color) {
    let pawnShift = (color == "w" ? 1 : -1);
    if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
      for (let i of [-1, 1]) {
        const nextFile = V.ComputeY(y + i);
        if (
          this.getPiece(x + pawnShift, nextFile) == V.PAWN &&
          this.getColor(x + pawnShift, nextFile) == color
        ) {
          return true;
        }
      }
    }
    return false;
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = V.ComputeY(y + step[1]);
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry = V.ComputeY(ry + step[1]);
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color
      ) {
        return true;
      }
    }
    return false;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 4,
      q: 10,
      k: 1000
    };
  }
};
