import { ChessRules, Move, PiPo } from "@/base_rules";

export class SynochessRules extends ChessRules {

  static get Options() {
    return {
      check: [
        {
          label: "Random",
          defaut: false,
          variable: "random"
        }
      ]
    };
  }

  static get LoseOnRepetition() {
    return true;
  }

  static IsGoodFlags(flags) {
    // Only white can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-2]$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { reserve: fenParts[5] }
    );
  }

  static GenRandInitFen(options) {
    if (!options.random)
      return "rneakenr/8/1c4c1/1ss2ss1/8/8/PPPPPPPP/RNBQKBNR w 0 ah - 2";

    // Mapping kingdom --> dynasty:
    const piecesMap = {
      'r': 'r',
      'n': 'n',
      'b': 'e',
      'q': 'a',
      'k': 'k'
    };

    // Always symmetric (randomness = 1), because open files.
    const baseFen = ChessRules.GenRandInitFen({ randomness: 1 });
    return (
      baseFen.substr(0, 8).split("").map(p => piecesMap[p]).join("") +
      "/8/1c4c1/1ss2ss1/" + baseFen.substr(22, 28) + " - 2"
    );
  }

  getReserveFen() {
    return (!!this.reserve ? this.reserve["b"][V.SOLDIER] : 0);
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Also init reserve (used by the interface to show landable soldiers)
    const reserve = parseInt(V.ParseFen(fen).reserve, 10);
    if (reserve > 0) this.reserve = { 'b': { [V.SOLDIER]: reserve } };
  }

  getColor(i, j) {
    if (i >= V.size.x) return 'b';
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.SOLDIER;
    return this.board[i][j].charAt(1);
  }

  getReservePpath(index, color) {
    // Only one piece type: soldier
    return "Synochess/" + color + V.SOLDIER;
  }

  static get RESERVE_PIECES() {
    return [V.SOLDIER];
  }

  getReserveMoves(x) {
    const color = this.turn;
    if (!this.reserve || this.reserve[color][V.SOLDIER] == 0) return [];
    let moves = [];
    for (let i = 0; i < V.size.y; i++) {
      if (this.board[3][i] == V.EMPTY) {
        let mv = new Move({
          appear: [
            new PiPo({
              x: 3,
              y: i,
              c: color,
              p: V.SOLDIER
            })
          ],
          vanish: [],
          start: { x: x, y: 0 }, //a bit artificial...
          end: { x: 3, y: i }
        });
        moves.push(mv);
      }
    }
    return moves;
  }

  getPpath(b) {
    return (ChessRules.PIECES.includes(b[1]) ? "" : "Synochess/") + b;
  }

  getFlagsFen() {
    return this.castleFlags['w'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'w': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['w'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  static get ELEPHANT() {
    return "e";
  }

  static get CANNON() {
    return "c";
  }

  static get SOLDIER() {
    return "s";
  }

  static get ADVISOR() {
    return "a";
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat([V.ELEPHANT, V.ADVISOR, V.SOLDIER, V.CANNON])
    );
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        e: [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
          [-2, -2],
          [-2, 2],
          [2, -2],
          [2, 2]
        ]
      }
    );
  }

  getPotentialMovesFrom(sq) {
    if (sq[0] >= V.size.x)
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves(sq[0]);
    let moves = [];
    const piece = this.getPiece(sq[0], sq[1]);
    switch (piece) {
      case V.CANNON:
        moves = this.getPotentialCannonMoves(sq);
        break;
      case V.ELEPHANT:
        moves = this.getPotentialElephantMoves(sq);
        break;
      case V.ADVISOR:
        moves = this.getPotentialAdvisorMoves(sq);
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
    // TODO: from here, copy/paste from EmpireChess
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
    return moves.filter(m => {
      if (
        m.end.y != this.kingPos[oppCol][1] &&
        m.end.x != this.kingPos[oppCol][0]
      ) {
        return true;
      }
      // check == -1 if (row, or col) unchecked, 1 if checked and occupied,
      //          0 if checked and clear
      let check = [-1, -1];
      // TODO: factor two next "if"...
      if (m.end.x == this.kingPos[oppCol][0]) {
        if (check[0] < 0) {
          // Do the check:
          check[0] = 0;
          let [kingPos1, kingPos2] = [m.end.y, this.kingPos[oppCol][1]];
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
        let [kingPos1, kingPos2] = [m.end.x, this.kingPos[oppCol][0]];
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

  getPotentialAdvisorMoves(sq) {
    return super.getSlideNJumpMoves(
      sq, V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'w') return super.getPotentialKingMoves([x, y]);
    // Dynasty doesn't castle:
    return super.getSlideNJumpMoves(
      [x, y], V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
  }

  getPotentialSoldierMoves([x, y]) {
    const c = this.getColor(x, y);
    const shiftX = (c == 'w' ? -1 : 1);
    const lastRank = (c == 'w' && x == 0 || c == 'b' && x == 9);
    let steps = [];
    if (!lastRank) steps.push([shiftX, 0]);
    if (y > 0) steps.push([0, -1]);
    if (y < 9) steps.push([0, 1]);
    return super.getSlideNJumpMoves([x, y], steps, 1);
  }

  getPotentialElephantMoves([x, y]) {
    return this.getSlideNJumpMoves([x, y], V.steps[V.ELEPHANT], 1);
  }

  // NOTE: (mostly) duplicated from Shako (TODO?)
  getPotentialCannonMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    // Look in every direction until an obstacle (to jump) is met
    for (const step of V.steps[V.ROOK]) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      // Then, search for an enemy (if jumped piece isn't a cannon)
      if (V.OnBoard(i, j) && this.getPiece(i, j) != V.CANNON) {
        i += step[0];
        j += step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          moves.push(this.getBasicMove([x, y], [i, j]));
          i += step[0];
          j += step[1];
        }
        if (V.OnBoard(i, j) && this.getColor(i, j) == oppCol)
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttackedByRook(sq, color) ||
      super.isAttackedByKnight(sq, color) ||
      super.isAttackedByKing(sq, color) ||
      (
        color == 'w' &&
        (
          super.isAttackedByPawn(sq, color) ||
          super.isAttackedByBishop(sq, color) ||
          super.isAttackedByQueen(sq, color)
        )
      ) ||
      (
        color == 'b' &&
        (
          this.isAttackedByCannon(sq, color) ||
          this.isAttackedBySoldier(sq, color) ||
          this.isAttackedByAdvisor(sq, color) ||
          this.isAttackedByElephant(sq, color)
        )
      )
    );
  }

  // NOTE: (mostly) duplicated from Shako (TODO?)
  isAttackedByCannon([x, y], color) {
    // Reversed process: is there an obstacle in line,
    // and a cannon next in the same line?
    for (const step of V.steps[V.ROOK]) {
      let [i, j] = [x+step[0], y+step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.getPiece(i, j) != V.CANNON) {
        // Keep looking in this direction
        i += step[0];
        j += step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.getPiece(i, j) == V.CANNON &&
          this.getColor(i, j) == color
        ) {
          return true;
        }
      }
    }
    return false;
  }

  isAttackedByAdvisor(sq, color) {
    return super.isAttackedBySlideNJump(
      sq, color, V.ADVISOR, V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
  }

  isAttackedByElephant(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.ELEPHANT, V.steps[V.ELEPHANT], 1);
  }

  isAttackedBySoldier([x, y], color) {
    const shiftX = (color == 'w' ? 1 : -1); //shift from king
    return super.isAttackedBySlideNJump(
      [x, y], color, V.SOLDIER, [[shiftX, 0], [0, 1], [0, -1]], 1);
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    const color = this.turn;
    if (!!this.reserve && color == 'b')
      moves = moves.concat(this.getReserveMoves(V.size.x + 1));
    return this.filterValid(moves);
  }

  atLeastOneMove() {
    if (!super.atLeastOneMove()) {
      if (!!this.reserve && this.turn == 'b') {
        let moves = this.filterValid(this.getReserveMoves(V.size.x + 1));
        if (moves.length > 0) return true;
      }
      return false;
    }
    return true;
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

  updateCastleFlags(move, piece) {
    // Only white can castle:
    const firstRank = 0;
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
    super.postPlay(move);
    // After black move, turn == 'w':
    if (!!this.reserve && this.turn == 'w' && move.vanish.length == 0)
      if (--this.reserve['b'][V.SOLDIER] == 0) this.reserve = null;
  }

  postUndo(move) {
    super.postUndo(move);
    if (this.turn == 'b' && move.vanish.length == 0) {
      if (!this.reserve) this.reserve = { 'b': { [V.SOLDIER]: 1 } };
      else this.reserve['b'][V.SOLDIER]++;
    }
  }

  static get VALUES() {
    return Object.assign(
      {
        s: 2,
        a: 2.75,
        e: 2.75,
        c: 3
      },
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  evalPosition() {
    let evaluation = super.evalPosition();
    if (this.turn == 'b' && !!this.reserve)
      // Add reserves:
      evaluation += this.reserve['b'][V.SOLDIER] * V.VALUES[V.SOLDIER];
    return evaluation;
  }

};
