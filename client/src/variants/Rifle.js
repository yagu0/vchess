import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class RifleRules extends ChessRules {
  getEpSquare(moveOrSquare) {
    if (typeof moveOrSquare !== "object" || moveOrSquare.appear.length > 0)
      return super.getEpSquare(moveOrSquare);
    // Capturing move: no en-passant
    return undefined;
  }

  getBasicMove([sx, sy], [ex, ey], tr) {
    let mv = new Move({
      appear: [],
      vanish: [],
      start: {x:sx, y:sy},
      end: {x:ex, y:ey}
    });
    if (this.board[ex][ey] != V.EMPTY) {
      // No movement: just vanishing enemy piece
      mv.vanish = [
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.getPiece(ex, ey)
        })
      ];
    }
    else {
      // Normal move
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : this.getColor(sx, sy),
          p: tr ? tr.p : this.getPiece(sx, sy)
        })
      ];
      mv.vanish = [
        new PiPo({
          x: sx,
          y: sy,
          c: this.getColor(sx, sy),
          p: this.getPiece(sx, sy)
        })
      ];
    }

    return mv;
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
      Math.abs(epSquare.y - y) == 1
    ) {
      let enpassantMove = new Move({
        appear: [],
        vanish: [],
        start: {x:x, y:y},
        end: {x:x+shiftX, y:epSquare.y}
      });
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
};
