import { ChessRules } from "@/base_rules";

export class Knightmate2Rules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get COMMONER() {
    return "c";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.COMMONER]);
  }

  getPpath(b) {
    return ([V.KING, V.COMMONER].includes(b[1]) ? "Knightmate/" : "") + b;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // 1 or 2 kings should be on board.
    if (Object.values(kings).some(k => ![1, 2].includes(k))) return false;
    return true;
  }

  scanKings() {}

  static GenRandInitFen(randomness) {
    return (
      ChessRules.GenRandInitFen(randomness)
      .replace(/k/g, 'c').replace(/K/g, 'C')
      .replace(/n/g, 'k').replace(/N/g, 'K')
    );
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.COMMONER:
        return this.getPotentialCommonerMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialCommonerMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  getPotentialKingMoves(sq) {
    return super.getPotentialKnightMoves(sq);
  }

  isAttacked(sq, color) {
    return (
      this.isAttackedByCommoner(sq, color) ||
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByQueen(sq, color) ||
      this.isAttackedByKing(sq, color)
    );
  }

  isAttackedByKing(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.KING,
      V.steps[V.KNIGHT],
      "oneStep"
    );
  }

  isAttackedByCommoner(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.COMMONER,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  postPlay() {}
  postUndo() {}

  // NOTE: 4 next functions (almost) copy-paste from Spartan Chess
  getKingsPos(color) {
    let kings = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.KING
        ) {
          kings.push({ x: i, y: j });
        }
      }
    }
    return kings;
  }

  getCheckSquares() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const kings = this.getKingsPos(color);
    let res = [];
    for (let i of [0, 1]) {
      if (
        kings.length >= i+1 &&
        super.isAttacked([kings[i].x, kings[i].y], oppCol)
      ) {
        res.push([kings[i].x, kings[i].y]);
      }
    }
    return res;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = moves[0].vanish[0].c;
    const oppCol = V.GetOppCol(color);
    // Check if both kings under attack.
    // If yes, moves must remove at least one attack.
    const kings = this.getKingsPos(color);
    return moves.filter(m => {
      this.play(m);
      let attacks = 0;
      for (let k of kings) {
        const curKingPos =
          this.board[k.x][k.y] == V.EMPTY
            ? [m.appear[0].x, m.appear[0].y] //king moved
            : [k.x, k.y]
        if (super.isAttacked(curKingPos, oppCol)) attacks++;
        else break; //no need to check further
      }
      this.undo(m);
      return (
        (kings.length == 2 && attacks <= 1) ||
        (kings.length == 1 && attacks == 0)
      );
    });
  }

  getCurrentScore() {
    if (super.atLeastOneMove()) return "*";
    // Count kings on board
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const kings = this.getKingsPos(color);
    if (
      super.isAttacked([kings[0].x, kings[0].y], oppCol) ||
      (kings.length == 2 && super.isAttacked([kings[1].x, kings[1].y], oppCol))
    ) {
      return (color == 'w' ? "0-1" : "1-0");
    }
    return "1/2"; //stalemate
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      c: 5, //the commoner is valuable
      b: 3,
      q: 9,
      k: 1000
    };
  }

};
