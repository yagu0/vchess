import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class AntimatterRules extends ChessRules {
  getBasicMove([sx, sy], [ex, ey]) {
    const startColor = this.getColor(sx, sy);
    const startPiece = this.getPiece(sx, sy);
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: startColor,
          p: startPiece
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: startColor,
          p: startPiece
        })
      ]
    });

    if (this.board[ex][ey] != V.EMPTY) {
      const endColor = this.getColor(ex, ey);
      const endPiece = this.getPiece(ex, ey);
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: endColor,
          p: endPiece
        })
      );
      mv.appear.push(
        new PiPo({
          x: sx,
          y: sy,
          c: endColor,
          p: endPiece
        })
      );
    }
    return mv;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const firstRank = color == "w" ? sizeX - 1 : 0;

    if (x + shiftX >= 0 && x + shiftX < sizeX) {
      // One square forward
      if (this.board[x + shiftX][y] == V.EMPTY) {
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], {
            c: color,
            p: "p"
          })
        );
        if (
          [startRank,firstRank].includes(x) &&
          this.board[x + 2 * shiftX][y] == V.EMPTY
        ) {
          // Two squares jump
          moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
        }
      }
      // Swaps
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
              p: "p"
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
      Math.abs(epSquare.y - y) == 1
    ) {
      let enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      const oppCol = V.GetOppCol(color);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: "p",
        c: oppCol
      });
      enpassantMove.appear.push({
        x: x,
        y: y,
        p: "p",
        c: oppCol
      });
      moves.push(enpassantMove);
    }

    return moves;
  }

  getPotentialKingMoves() {
    return [];
  }

  updateVariables(move) {
    super.updateVariables(move);
    if (move.vanish.length == 2) {
      // Was opponent king swapped?
      if (move.vanish[1].p == V.KING)
        this.kingPos[this.turn] = [move.appear[1].x, move.appear[1].y];
    }
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    if (move.appear.length == 2) {
      // Was opponent king swapped?
      if (move.appear[1].p == V.KING)
        this.kingPos[move.vanish[1].c] = [move.vanish[1].x,move.vanish[1].y];
    }
  }

  atLeastOneMove() {
    return true;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (color == "w" && kp[0] == 0)
      return "0-1";
    if (color == "b" && kp[0] == V.size.x - 1)
      return "1-0";
    // King is not on the opposite edge: game not over
    return "*";
  }

  evalPosition() {
    // Very simple criterion for now: kings position
    return this.kingPos["w"][0] + this.kingPos["b"][0];
  }
};
