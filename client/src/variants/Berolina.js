import { ChessRules } from "@/base_rules";

export class BerolinaRules extends ChessRules {
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
        // The arrival column must be remembered, because
        // potentially two pawns could be candidates to be captured:
        // one on our left, and one on our right.
        move.end.y
      ];
    }
    return undefined; //default
  }

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const epParts = enpassant.split(",");
      const epSq = V.SquareToCoords(epParts[0]);
      if (isNaN(epSq.x) || isNaN(epSq.y) || !V.OnBoard(epSq)) return false;
      const arrCol = V.ColumnToCoord(epParts[1]);
      if (isNaN(arrCol) || arrCol < 0 || arrCol >= V.size.y) return false;
    }
    return true;
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    return (
      V.CoordsToSquare(this.epSquares[L - 1][0]) +
      "," +
      V.CoordToColumn(this.epSquares[L - 1][1])
    );
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
          V.PawnSpecs.twoSquares &&
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

    // Next condition so that other variants could inherit from this class
    if (V.PawnSpecs.enPassant) {
      // En passant
      const Lep = this.epSquares.length;
      const epSquare = this.epSquares[Lep - 1]; //always at least one element
      if (
        !!epSquare &&
        epSquare[0].x == x + shiftX &&
        epSquare[0].y == y
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
    }

    return moves;
  }

  isAttackedByPawn([x, y], color) {
    let pawnShift = (color == "w" ? 1 : -1);
    if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
      if (
        this.getPiece(x + pawnShift, y) == V.PAWN &&
        this.getColor(x + pawnShift, y) == color
      ) {
        return true;
      }
    }
    return false;
  }

  static get SEARCH_DEPTH() {
    return 2;
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
        // Promotion
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    return super.getNotation(move); //all other pieces are orthodox
  }
};
