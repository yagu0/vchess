import { ChessRules } from "@/base_rules";

export class EmpireRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.QUEEN] }
    );
  }

  static get LoseOnRepetition() {
    return true;
  }

  static IsGoodFlags(flags) {
    // Only black can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  getPpath(b) {
    return (b[0] == 'w' ? "Empire/" : "") + b;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnbqkbnr/pppppppp/8/8/8/PPPSSPPP/8/TECDKCET w 0 ah -";

    // Mapping kingdom --> empire:
    const piecesMap = {
      'R': 'T',
      'N': 'E',
      'B': 'C',
      'Q': 'D',
      'K': 'K'
    };

    const baseFen = ChessRules.GenRandInitFen(randomness);
    return (
      baseFen.substr(0, 24) + "PPPSSPPP/8/" +
      baseFen.substr(35, 8).split('').map(p => piecesMap[p]).join('') +
      baseFen.substr(43, 5) + baseFen.substr(50)
    );
  }

  getFlagsFen() {
    return this.castleFlags['b'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'b': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['b'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  static get TOWER() {
    return 't';
  }
  static get EAGLE() {
    return 'e';
  }
  static get CARDINAL() {
    return 'c';
  }
  static get DUKE() {
    return 'd';
  }
  static get SOLDIER() {
    return 's';
  }
  // Kaiser is technically a King, so let's keep things simple.

  static get PIECES() {
    return ChessRules.PIECES.concat(
      [V.TOWER, V.EAGLE, V.CARDINAL, V.DUKE, V.SOLDIER]);
  }

  getPotentialMovesFrom(sq) {
    let moves = [];
    const piece = this.getPiece(sq[0], sq[1]);
    switch (piece) {
      case V.TOWER:
        moves = this.getPotentialTowerMoves(sq);
        break;
      case V.EAGLE:
        moves = this.getPotentialEagleMoves(sq);
        break;
      case V.CARDINAL:
        moves = this.getPotentialCardinalMoves(sq);
        break;
      case V.DUKE:
        moves = this.getPotentialDukeMoves(sq);
        break;
      case V.SOLDIER:
        moves = this.getPotentialSoldierMoves(sq);
        break;
      default:
        moves = super.getPotentialMovesFrom(sq);
    }
    if (
      piece != V.KING &&
      this.kingPos['w'][0] != this.kingPos['b'][0] &&
      this.kingPos['w'][1] != this.kingPos['b'][1]
    ) {
      return moves;
    }
    // TODO: factor two next "if" into one (rank/column...)
    if (this.kingPos['w'][1] == this.kingPos['b'][1]) {
      const colKing = this.kingPos['w'][1];
      let intercept = 0; //count intercepting pieces
      let [kingPos1, kingPos2] = [this.kingPos['w'][0], this.kingPos['b'][0]];
      if (kingPos1 > kingPos2) [kingPos1, kingPos2] = [kingPos2, kingPos1];
      for (let i = kingPos1 + 1; i < kingPos2; i++) {
        if (this.board[i][colKing] != V.EMPTY) intercept++;
      }
      if (intercept >= 2) return moves;
      // intercept == 1 (0 is impossible):
      // Any move not removing intercept is OK
      return moves.filter(m => {
        return (
          // From another column?
          m.start.y != colKing ||
          // From behind a king? (including kings themselves!)
          m.start.x <= kingPos1 ||
          m.start.x >= kingPos2 ||
          // Intercept piece moving: must remain in-between
          (
            m.end.y == colKing &&
            m.end.x > kingPos1 &&
            m.end.x < kingPos2
          )
        );
      });
    }
    if (this.kingPos['w'][0] == this.kingPos['b'][0]) {
      const rowKing = this.kingPos['w'][0];
      let intercept = 0; //count intercepting pieces
      let [kingPos1, kingPos2] = [this.kingPos['w'][1], this.kingPos['b'][1]];
      if (kingPos1 > kingPos2) [kingPos1, kingPos2] = [kingPos2, kingPos1];
      for (let i = kingPos1 + 1; i < kingPos2; i++) {
        if (this.board[rowKing][i] != V.EMPTY) intercept++;
      }
      if (intercept >= 2) return moves;
      // intercept == 1 (0 is impossible):
      // Any move not removing intercept is OK
      return moves.filter(m => {
        return (
          // From another row?
          m.start.x != rowKing ||
          // From "behind" a king? (including kings themselves!)
          m.start.y <= kingPos1 ||
          m.start.y >= kingPos2 ||
          // Intercept piece moving: must remain in-between
          (
            m.end.x == rowKing &&
            m.end.y > kingPos1 &&
            m.end.y < kingPos2
          )
        );
      });
    }
    // piece == king: check only if move.end.y == enemy king column,
    // or if move.end.x == enemy king rank.
    const color = this.getColor(sq[0], sq[1]);
    const oppCol = V.GetOppCol(color);
    // check == -1 if (row, or col) unchecked, 1 if checked and occupied,
    //          0 if checked and clear
    let check = [-1, -1];
    return moves.filter(m => {
      if (
        m.end.y != this.kingPos[oppCol][1] &&
        m.end.x != this.kingPos[oppCol][0]
      ) {
        return true;
      }
      // TODO: factor two next "if"...
      if (m.end.x == this.kingPos[oppCol][0]) {
        if (check[0] < 0) {
          // Do the check:
          check[0] = 0;
          let [kingPos1, kingPos2] =
            [this.kingPos[color][1], this.kingPos[oppCol][1]];
          if (kingPos1 > kingPos2) [kingPos1, kingPos2] = [kingPos2, kingPos1];
          for (let i = kingPos1 + 1; i < kingPos2; i++) {
            if (this.board[m.end.x][i] != V.EMPTY) {
              check[0]++;
              break;
            }
          }
          return check[0] == 1;
        }
        // Check already done:
        return check[0] == 1;
      }
      //if (m.end.y == this.kingPos[oppCol][1]) //true...
      if (check[1] < 0) {
        // Do the check:
        check[1] = 0;
        let [kingPos1, kingPos2] =
          [this.kingPos[color][0], this.kingPos[oppCol][0]];
        if (kingPos1 > kingPos2) [kingPos1, kingPos2] = [kingPos2, kingPos1];
        for (let i = kingPos1 + 1; i < kingPos2; i++) {
          if (this.board[i][m.end.y] != V.EMPTY) {
            check[1]++;
            break;
          }
        }
        return check[1] == 1;
      }
      // Check already done:
      return check[1] == 1;
    });
  }

  getSlideNJumpMoves_([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      const s = step.s;
      let i = x + s[0];
      let j = y + s[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (!step.onlyTake) moves.push(this.getBasicMove([x, y], [i, j]));
        // NOTE: (bad) HACK here, since onlyTake is true only for Eagle
        // capturing moves, which are oneStep...
        if (!!oneStep || !!step.onlyTake) continue outerLoop;
        i += s[0];
        j += s[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]) && !step.onlyMove)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  static get steps() {
    return (
      Object.assign(
        {
          t: [
            { s: [-1, 0] },
            { s: [1, 0] },
            { s: [0, -1] },
            { s: [0, 1] },
            { s: [-1, -1], onlyMove: true },
            { s: [-1, 1], onlyMove: true },
            { s: [1, -1], onlyMove: true },
            { s: [1, 1], onlyMove: true }
          ],
          c: [
            { s: [-1, 0], onlyMove: true },
            { s: [1, 0], onlyMove: true },
            { s: [0, -1], onlyMove: true },
            { s: [0, 1], onlyMove: true },
            { s: [-1, -1] },
            { s: [-1, 1] },
            { s: [1, -1] },
            { s: [1, 1] }
          ],
          e: [
            { s: [-1, 0], onlyMove: true },
            { s: [1, 0], onlyMove: true },
            { s: [0, -1], onlyMove: true },
            { s: [0, 1], onlyMove: true },
            { s: [-1, -1], onlyMove: true },
            { s: [-1, 1], onlyMove: true },
            { s: [1, -1], onlyMove: true },
            { s: [1, 1], onlyMove: true },
            { s: [-2, -1], onlyTake: true },
            { s: [-2, 1], onlyTake: true },
            { s: [-1, -2], onlyTake: true },
            { s: [-1, 2], onlyTake: true },
            { s: [1, -2], onlyTake: true },
            { s: [1, 2], onlyTake: true },
            { s: [2, -1], onlyTake: true },
            { s: [2, 1], onlyTake: true }
          ]
        },
        ChessRules.steps
      )
    );
  }

  getPotentialTowerMoves(sq) {
    return this.getSlideNJumpMoves_(sq, V.steps[V.TOWER]);
  }

  getPotentialCardinalMoves(sq) {
    return this.getSlideNJumpMoves_(sq, V.steps[V.CARDINAL]);
  }

  getPotentialEagleMoves(sq) {
    return this.getSlideNJumpMoves_(sq, V.steps[V.EAGLE]);
  }

  getPotentialDukeMoves([x, y]) {
    // Anything to capture around? mark other steps to explore after
    let steps = [];
    const oppCol = V.GetOppCol(this.getColor(x, y));
    let moves = [];
    for (let s of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        moves.push(super.getBasicMove([x, y], [i, j]));
      }
      else steps.push({ s: s, onlyMove: true });
    }
    if (steps.length > 0) {
      const noncapturingMoves = this.getSlideNJumpMoves_([x, y], steps);
      Array.prototype.push.apply(moves, noncapturingMoves);
    }
    return moves;
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'b') return super.getPotentialKingMoves([x, y]);
    // Empire doesn't castle:
    return super.getSlideNJumpMoves(
      [x, y],
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  getPotentialSoldierMoves([x, y]) {
    const c = this.getColor(x, y);
    const shiftX = (c == 'w' ? -1 : 1);
    const lastRank = (c == 'w' && x == 0 || c == 'b' && x == 9);
    let steps = [];
    if (!lastRank) steps.push([shiftX, 0]);
    if (y > 0) steps.push([0, -1]);
    if (y < 9) steps.push([0, 1]);
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  isAttacked(sq, color) {
    if (color == 'b') return super.isAttacked(sq, color);
    // Empire: only pawn and king (+ queen if promotion) in common:
    return (
      super.isAttackedByPawn(sq, color) ||
      this.isAttackedByTower(sq, color) ||
      this.isAttackedByEagle(sq, color) ||
      this.isAttackedByCardinal(sq, color) ||
      this.isAttackedByDuke(sq, color) ||
      this.isAttackedBySoldier(sq, color) ||
      super.isAttackedByKing(sq, color) ||
      super.isAttackedByQueen(sq, color)
    );
  }

  isAttackedByTower(sq, color) {
    return super.isAttackedBySlideNJump(sq, color, V.TOWER, V.steps[V.ROOK]);
  }

  isAttackedByEagle(sq, color) {
    return super.isAttackedBySlideNJump(
      sq, color, V.EAGLE, V.steps[V.KNIGHT], "oneStep");
  }

  isAttackedByCardinal(sq, color) {
    return super.isAttackedBySlideNJump(
      sq, color, V.CARDINAL, V.steps[V.BISHOP]);
  }

  isAttackedByDuke(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq, color, V.DUKE,
        V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep"
      )
    );
  }

  isAttackedBySoldier([x, y], color) {
    const shiftX = (color == 'w' ? 1 : -1); //shift from king
    return super.isAttackedBySlideNJump(
      [x, y], color, V.SOLDIER, [[shiftX, 0], [0, 1], [0, -1]], "oneStep");
  }

  updateCastleFlags(move, piece) {
    // Only black can castle:
    const firstRank = 0;
    if (piece == V.KING && move.appear[0].c == 'b')
      this.castleFlags['b'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['b'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['b'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
  }

  getCurrentScore() {
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    const lastRank = (color == 'w' ? 0 : 7);
    if (this.kingPos[color][0] == lastRank)
      // The opposing edge is reached!
      return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // Game over
    const oppCol = this.turn;
    return (oppCol == "w" ? "0-1" : "1-0");
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        t: 7,
        e: 7,
        c: 4,
        d: 4,
        s: 2
      }
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
