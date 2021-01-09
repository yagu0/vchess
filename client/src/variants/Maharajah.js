import { ChessRules } from "@/base_rules";

export class MaharajahRules extends ChessRules {

  static get HasEnpassant() {
    return false;
  }

  static get MAHARAJAH() {
    return 'm';
  }

  getPpath(b) {
    return b.charAt(0) == 'w' ? b : "Maharajah/bm";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.MAHARAJAH]);
  }

  static get M_EXTRA_STEPS() {
    return [
      // Jumping options:
      [-2, -2],
      [-2, 0],
      [-2, 2],
      [0, -2],
      [0, 2],
      [2, -2],
      [2, 0],
      [2, 2]
    ];
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let wKingCount = 0;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowR = row[i].toLowerCase();
        if (!!lowR.match(/[a-z]/)) {
          if (row[i] == lowR && row[i] != 'm') return false;
          if (row[i] == 'K') wKingCount++;
          if (V.PIECES.includes(lowR)) sumElts++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (wKingCount != 1) return false;
    return true;
  }

  static IsGoodFlags(flags) {
    // Only white can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  scanKings(fen) {
    // Square of white king only:
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "K":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  static GenRandInitFen(randomness) {
    const sFen = ChessRules.GenRandInitFen(Math.max(randomness, 1));
    return "3mm3/8/" + sFen.substring(18, 50);
  }

  getFlagsFen() {
    return this.castleFlags['w'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'w': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['w'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  getPotentialMovesFrom(sq) {
    if (this.turn == 'w') return super.getPotentialMovesFrom(sq);
    return this.getPotentialMaharajahMoves(sq);
  }

  getPotentialMaharajahMoves(sq) {
    let moves = super.getPotentialQueenMoves(sq);
    moves = moves.concat(super.getPotentialKnightMoves(sq));
    const otherJumpMoves =
      super.getSlideNJumpMoves(sq, V.M_EXTRA_STEPS, "oneStep")
      .filter(m =>
        moves.every(mv => mv.end.x != m.end.x || mv.end.y != m.end.y));
    return moves.concat(otherJumpMoves);
  }

  isAttacked() {
    return false;
  }
  getCheckSquares() {
    return [];
  }
  filterValid(moves) {
    return moves;
  }

  updateCastleFlags(move, piece) {
    // Only white can castle:
    const firstRank = 7;
    if (piece == V.KING && move.appear[0].c == 'w')
      this.castleFlags['w'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['w'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['w'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
  }

  postPlay(move) {
    if (this.turn == 'b') super.postPlay(move);
    else {
      // After a black move: white king may have disappeared
      if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
        this.kingPos['w'] = [-1, -1];
    }
  }

  postUndo(move) {
    if (this.turn == 'w') super.postUndo(move);
    else {
      // After undoing a black move (may have captured king)
      if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
        this.kingPos['w'] = [move.end.x, move.end.y];
    }
  }

  getCurrentScore() {
    if (this.turn == 'w' && this.kingPos['w'][0] < 0) return "0-1";
    if (
      this.turn == 'b' &&
      this.board.every(row => row.every(cell => cell.charAt(0) != 'b'))
    ) {
      return "1-0";
    }
    return "*";
  }

  static get VALUES() {
    return Object.assign({ m: 15 }, ChessRules.VALUES);
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
