import { ChessRules } from "@/base_rules";

export class AlapoRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Lines() {
    return [
      [[1, 0], [1, 6]],
      [[5, 0], [5, 6]]
    ];
  }

  static get PIECES() {
    return [V.ROOK, V.BISHOP, V.QUEEN, V.ROOK_S, V.BISHOP_S, V.QUEEN_S];
  }

  static get ROOK_S() {
    return "t";
  }
  static get BISHOP_S() {
    return "c";
  }
  static get QUEEN_S() {
    return "s";
  }

  getPotentialMinirookMoves(sq) {
    return super.getSlideNJumpMoves(sq, V.steps[V.ROOK], "oneStep");
  }
  getPotentialMinibishopMoves(sq) {
    return super.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep");
  }
  getPotentialMiniqueenMoves(sq) {
    return (
      super.getSlideNJumpMoves(
        sq, V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep")
    );
  }

  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.ROOK: return super.getPotentialRookMoves(sq);
      case V.BISHOP: return super.getPotentialBishopMoves(sq);
      case V.QUEEN: return super.getPotentialQueenMoves(sq);
      case V.ROOK_S: return this.getPotentialMinirookMoves(sq);
      case V.BISHOP_S: return this.getPotentialMinibishopMoves(sq);
      case V.QUEEN_S: return this.getPotentialMiniqueenMoves(sq);
    }
    return [];
  }

  static get size() {
    return { x: 6, y: 6 };
  }

  getPpath(b, color, score, orientation) {
    // 'i' for "inversed":
    const suffix = (b[0] == orientation ? "" : "i");
    return "Alapo/" + b + suffix;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rbqqbr/tcssct/6/6/TCSSCT/RBQQBR w 0";

    const piece2pawn = {
      r: 't',
      q: 's',
      b: 'c'
    };

    let pieces = { w: new Array(6), b: new Array(6) };
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(6);

      // Get random squares for bishops
      let randIndex = 2 * randInt(3);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(3) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random square for queens
      randIndex = randInt(4);
      const queen1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(3);
      const queen2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks positions are now fixed,
      const rook1Pos = positions[0];
      const rook2Pos = positions[1];

      pieces[c][rook1Pos] = "r";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queen1Pos] = "q";
      pieces[c][queen2Pos] = "q";
      pieces[c][bishop2Pos] = "b";
      pieces[c][rook2Pos] = "r";
    }
    return (
      pieces["b"].join("") + "/" +
      pieces["b"].map(p => piece2pawn[p]).join() +
      "/8/8/8/8/" +
      pieces["w"].map(p => piece2pawn[p].toUpperCase()).join() + "/" +
      pieces["w"].join("").toUpperCase() +
      " w 0"
    );
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    // Just check that at least one piece of each color is there:
    let pieces = { "w": 0, "b": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowerRi = row[i].toLowerCase();
        if (V.PIECES.includes(lowerRi)) {
          pieces[row[i] == lowerRi ? "b" : "w"]++;
          sumElts++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(pieces).some(v => v == 0)) return false;
    return true;
  }

  // Find possible captures by opponent on [x, y]
  findCaptures([x, y]) {
    const color = this.getColor(x, y);
    let moves = [];
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    const oppCol = V.GetOppCol(color);
    for (let loop = 0; loop < steps.length; loop++) {
      const step = steps[loop];
      let i = x + step[0];
      let j = y + step[1];
      let stepsAfter = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
        stepsAfter++;
      }
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        const oppPiece = this.getPiece(i, j);
        if (
          (
            stepsAfter >= 2 &&
            [V.ROOK_S, V.BISHOP_S, V.QUEEN_S].includes(oppPiece)
          )
          ||
          (
            [V.BISHOP, V.BISHOP_S].includes(oppPiece) &&
            step.some(e => e == 0)
          )
          ||
          (
            [V.ROOK, V.ROOK_S].includes(oppPiece) &&
            step.every(e => e != 0)
          )
        ) {
          continue;
        }
        return true;
      }
    }
    return false;
  }

  postPlay() {}
  postUndo() {}

  getCheckSquares() {
    return [];
  }
  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    // Try both colors (to detect potential suicides)
    for (let c of ['w', 'b']) {
      const oppCol = V.GetOppCol(c);
      const goal = (c == 'w' ? 0 : 5);
      if (
        this.board[goal].some(
          (b,j) => b[0] == c && !this.findCaptures([goal, j])
        )
      ) {
        return c == 'w' ? "1-0" : "0-1";
      }
    }
    return super.getCurrentScore();
  }

};
