import { ChessRules } from "@/base_rules";

export class ArenaRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { captureBackward: true }
    );
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    // At most and at least one king or queen per color
    let royals = { "k": 0, "K": 0, "q": 0, "Q": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k','Q','q'].includes(row[i])) royals[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (
      Object.values(royals).some(v => v >= 2) ||
      royals['K'] + royals['Q'] == 0 ||
      royals['k'] + royals['q'] == 0
    ) {
      return false;
    }
    return true;
  }

  scanKings() {}

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

  postPlay() {} //no kingPos no castleFlags
  postUndo() {}

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
