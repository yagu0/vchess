import { ChessRules } from "@/base_rules";

export const VariantRules = class BerolinaRules extends ChessRules {
  // En-passant after 2-sq jump
  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      // Enemy pawn initial column must be given too:
      let res = [];
      const epParts = square.split(",");
      res.push(V.SquareToCoords(epParts[0]));
      res.push(V.ColumnToCoord(epParts[1]));
      return res;
    }
    // Argument is a move:
    const move = moveOrSquare;
    const [sx, ex, sy] = [move.start.x, move.end.x, move.start.y];
    if (this.getPiece(sx, sy) == V.PAWN && Math.abs(sx - ex) == 2) {
      return [
        {
          x: (ex + sx) / 2,
          y: (move.end.y + sy) / 2
        },
        move.end.y
      ];
    }
    return undefined; //default
  }

  // Special pawns movements
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;
    const finalPieces =
      x + shiftX == lastRank ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN] : [V.PAWN];

    // One square diagonally
    for (let shiftY of [-1, 1]) {
      if (this.board[x + shiftX][y + shiftY] == V.EMPTY) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
              c: color,
              p: piece
            })
          );
        }
        if (
          x == startRank &&
          y + 2 * shiftY >= 0 &&
          y + 2 * shiftY < sizeY &&
          this.board[x + 2 * shiftX][y + 2 * shiftY] == V.EMPTY
        ) {
          // Two squares jump
          moves.push(
            this.getBasicMove([x, y], [x + 2 * shiftX, y + 2 * shiftY])
          );
        }
      }
    }
    // Capture
    if (
      this.board[x + shiftX][y] != V.EMPTY &&
      this.canTake([x, y], [x + shiftX, y])
    ) {
      for (let piece of finalPieces)
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], { c: color, p: piece })
        );
    }

    // En passant
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
      !!epSquare &&
      epSquare[0].x == x + shiftX &&
      epSquare[0].y == y &&
      Math.abs(epSquare[1] - y) == 1
    ) {
      let enpassantMove = this.getBasicMove([x, y], [x + shiftX, y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare[1],
        p: "p",
        c: this.getColor(x, epSquare[1])
      });
      moves.push(enpassantMove);
    }

    return moves;
  }

  isAttackedByPawn([x, y], colors) {
    for (let c of colors) {
      let pawnShift = c == "w" ? 1 : -1;
      if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
        if (
          this.getPiece(x + pawnShift, y) == V.PAWN &&
          this.getColor(x + pawnShift, y) == c
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getNotation(move) {
    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      const finalSquare = V.CoordsToSquare(move.end);
      let notation = "";
      if (move.vanish.length == 2)
        //capture
        notation = "Px" + finalSquare;
      else {
        // No capture: indicate the initial square for potential ambiguity
        const startSquare = V.CoordsToSquare(move.start);
        notation = startSquare + finalSquare;
      }
      if (move.appear[0].p != V.PAWN)
        //promotion
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    return super.getNotation(move); //all other pieces are orthodox
  }
};
