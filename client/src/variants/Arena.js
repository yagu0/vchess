import { ChessRules } from "@/base_rules";

export const VariantRules = class ArenaRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness).slice(0, -6) + "-";
  }

  static InArena(x) {
    return Math.abs(3.5 - x) <= 1.5;
  }

  getPotentialMovesFrom([x, y]) {
    const moves = super.getPotentialMovesFrom([x, y]);
    // Eliminate moves which neither enter the arena or capture something
    return moves.filter(m => {
      const startInArena = V.InArena(m.start.x);
      const endInArena = V.InArena(m.end.x);
      return (
        (startInArena && endInArena && m.vanish.length == 2) ||
        (!startInArena && endInArena)
      );
    });

    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;

    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      moves.push(this.getBasicMove([x, y], [x + shiftX, y]));
      // Next condition because pawns on 1st rank can generally jump
      if (
        x == startRank &&
        this.board[x + 2 * shiftX][y] == V.EMPTY
      ) {
        // Two squares jump
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    // Captures: also possible backward
    for (let shiftY of [-1, 1]) {
      if (y + shiftY >= 0 && y + shiftY < sizeY) {
        for (let direction of [-1,1]) {
          if (
            this.board[x + direction][y + shiftY] != V.EMPTY &&
            this.canTake([x, y], [x + direction, y + shiftY])
          ) {
            moves.push(this.getBasicMove([x, y], [x + direction, y + shiftY]));
          }
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

  getPotentialQueenMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    ).filter(m => {
      // Filter out moves longer than 3 squares
      return Math.max(
        Math.abs(m.end.x - m.start.x),
        Math.abs(m.end.y - m.start.y)) <= 3;
    });
  }

  getPotentialKingMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    ).filter(m => {
      // Filter out moves longer than 3 squares
      return Math.max(
        Math.abs(m.end.x - m.start.x),
        Math.abs(m.end.y - m.start.y)) <= 3;
    });
  }

  getCheckSquares() {
    return [];
  }

  filterValid(moves) {
    // No check conditions
    return moves;
  }

  getCurrentScore() {
    const color = this.turn;
    if (!this.atLeastOneMove())
      // I cannot move anymore
      return color == "w" ? "0-1" : "1-0";
    // Win if the opponent has no more pieces left (in the Arena),
    // (and/)or if he lost both his dukes.
    let someUnitRemain = false;
    let atLeastOneDuke = false;
    let somethingInArena = false;
    outerLoop: for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (this.getColor(i,j) == color) {
          someUnitRemain = true;
          if (this.movesCount >= 2 && V.InArena(i)) {
            somethingInArena = true;
            if (atLeastOneDuke)
              break outerLoop;
          }
          if ([V.QUEEN,V.KING].includes(this.getPiece(i,j))) {
            atLeastOneDuke = true;
            if (this.movesCount < 2 || somethingInArena)
              break outerLoop;
          }
        }
      }
    }
    if (
      !someUnitRemain ||
      !atLeastOneDuke ||
      (this.movesCount >= 2 && !somethingInArena)
    ) {
      return color == "w" ? "0-1" : "1-0";
    }
    return "*";
  }

  static get SEARCH_DEPTH() {
    return 4;
  }
};
