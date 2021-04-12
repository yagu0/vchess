import { ChessRules } from "@/base_rules";

export class RollerballRules extends ChessRules {

  static get Options() {
    return null;
  }

  static get HasEnpassant() {
    return false;
  }

  static get HasCastle() {
    return false;
  }

  static get DarkBottomRight() {
    return true;
  }

  static get PIECES() {
    return [V.PAWN, V.KING, V.ROOK, V.BISHOP];
  }

  static get size() {
    return { x: 7, y: 7 };
  }

  // TODO: the wall position should be checked too
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (['x'].concat(V.PIECES).includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  // NOTE: canTake() is wrong, but next method is enough
  static OnBoard(x, y) {
    return (
      (x >= 0 && x <= 6 && y >= 0 && y <= 6) &&
      (![2, 3, 4].includes(x) || ![2, 3, 4].includes(y))
    );
  }

  static IsGoodFlags(flags) {
    // 2 for kings: last zone reached
    return !!flags.match(/^[0-7]{2,2}$/);
  }

  setFlags(fenflags) {
    this.kingFlags = {
      w: parseInt(fenflags.charAt(0), 10),
      b: parseInt(fenflags.charAt(1), 10)
    };
  }

  aggregateFlags() {
    return this.kingFlags;
  }

  disaggregateFlags(flags) {
    this.kingFlags = flags;
  }

  getFlagsFen() {
    return this.kingFlags['w'].toString() + this.kingFlags['b'].toString();
  }

  // For space in the middle:
  static get NOTHING() {
    return "xx";
  }

  static board2fen(b) {
    if (b[0] == 'x') return 'x';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'x') return V.NOTHING;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b[0] == 'x') return "Omega/nothing";
    return b;
  }

  static GenRandInitFen() {
    return "2rbp2/2rkp2/2xxx2/2xxx2/2xxx2/2PKR2/2PBR2 w 0 00";
  }

  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.PAWN: return this.getPotentialPawnMoves(sq);
      case V.ROOK: return this.getPotentialRookMoves(sq);
      case V.BISHOP: return this.getPotentialBishopMoves(sq);
      case V.KING: return super.getPotentialKingMoves(sq);
    }
    return [];
  }

  getPotentialPawnMoves([x, y]) {
    const c = this.turn;
    // Need to know pawn area to deduce move options
    const inMiddleX = [2, 3, 4].includes(x);
    const inMiddleY = [2, 3, 4].includes(y);
    // In rectangular areas on the sides?
    if (inMiddleX) {
      const forward = (y <= 1 ? -1 : 1);
      return (
        super.getSlideNJumpMoves(
          [x, y], [[forward, -1], [forward, 0], [forward, 1]], 1)
      );
    }
    if (inMiddleY) {
      const forward = (x <= 1 ? 1 : -1);
      let moves =
        super.getSlideNJumpMoves(
          [x, y], [[-1, forward], [0, forward], [1, forward]], 1);
      // Promotions may happen:
      let extraMoves = [];
      moves.forEach(m => {
        if (
          (c == 'w' && x <= 1 && m.end.y == 4) ||
          (c == 'b' && x >= 5 && m.end.y == 2)
        ) {
          m.appear[0].p = V.ROOK;
          let m2 = JSON.parse(JSON.stringify(m));
          m2.appear[0].p = V.BISHOP;
          extraMoves.push(m2);
        }
      });
      Array.prototype.push.apply(moves, extraMoves);
      return moves;
    }
    // In a corner:
    const toRight = (x == 0 && [0, 1, 5].includes(y)) || (x == 1 && y == 1);
    const toLeft = (x == 6 && [1, 5, 6].includes(y)) || (x == 5 && y == 5);
    const toUp = (y == 0 && [1, 5, 6].includes(x)) || (x == 5 && y == 1);
    const toBottom = (y == 6 && [0, 1, 5].includes(x)) || (x == 1 && y == 5);
    if (toRight || toLeft) {
      const forward = (toRight ? 1 : -1);
      return (
        super.getSlideNJumpMoves(
          [x, y], [[-1, forward], [0, forward], [1, forward]], 1)
      );
    }
    const forward = (toUp ? -1 : 1);
    return (
      super.getSlideNJumpMoves(
        [x, y], [[forward, -1], [forward, 0], [forward, 1]], 1)
    );
  }

  getPotentialRookMoves([x, y]) {
    let multiStep = [],
        oneStep = [];
    if (x <= 1) multiStep.push([0, 1]);
    else oneStep.push([0, 1]);
    if (y <= 1) multiStep.push([-1, 0]);
    else oneStep.push([-1, 0]);
    if (x >= 5) multiStep.push([0, -1]);
    else oneStep.push([0, -1]);
    if (y >= 5) multiStep.push([1, 0]);
    else oneStep.push([1, 0]);
    const c = this.turn;
    let moves = super.getSlideNJumpMoves([x, y], oneStep, 1);
    for (let step of multiStep) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (this.getColor(i, j) != c)
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
      else {
        i -= step[0];
        j -= step[1];
        // Potential rebound if away from initial square
        if (i != x || j != y) {
          // Corners check
          let nextStep = null;
          if (i == 0 && j == 0) nextStep = [0, 1];
          else if (i == 0 && j == 6) nextStep = [1, 0];
          else if (i == 6 && j == 6) nextStep = [0, -1];
          else if (i == 6 && j == 0) nextStep = [-1, 0];
          if (!!nextStep) {
            i += nextStep[0];
            j += nextStep[1];
            while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
              moves.push(this.getBasicMove([x, y], [i, j]));
              i += nextStep[0];
              j += nextStep[1];
            }
            if (V.OnBoard(i, j) && this.getColor(i, j) != c)
              moves.push(this.getBasicMove([x, y], [i, j]));
          }
        }
      }
    }
    return moves;
  }

  static get DictBishopSteps() {
    return {
      "-1_-1": [-1, -1],
      "-1_1": [-1, 1],
      "1_-1": [1, -1],
      "1_1": [1, 1]
    };
  }

  getPotentialBishopMoves([x, y]) {
    let multiStep = {};
    if (x <= 1) {
      multiStep["-1_1"] = [-1, 1];
      multiStep["1_1"] = [1, 1];
    }
    if (y <= 1) {
      multiStep["-1_-1"] = [-1, -1];
      if (!multiStep["-1_1"]) multiStep["-1_1"] = [-1, 1];
    }
    if (x >= 5) {
      multiStep["1_-1"] = [1, -1];
      if (!multiStep["-1_-1"]) multiStep["-1_-1"] = [-1, -1];
    }
    if (y >= 5) {
      if (!multiStep["1_-1"]) multiStep["1_-1"] = [1, -1];
      if (!multiStep["1_1"]) multiStep["1_1"] = [1, 1];
    }
    let oneStep = [];
    Object.keys(V.DictBishopSteps).forEach(str => {
      if (!multiStep[str]) oneStep.push(V.DictBishopSteps[str]);
    });
    const c = this.turn;
    let moves = super.getSlideNJumpMoves([x, y], oneStep, 1);
    for (let step of Object.values(multiStep)) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (this.getColor(i, j) != c)
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
      else {
        i -= step[0];
        j -= step[1];
        // Rebound, if we moved away from initial square
        if (i != x || j != y) {
          let nextStep = null;
          if (step[0] == -1 && step[1] == -1) {
            if (j == 0) nextStep = [-1, 1];
            else nextStep = [1, -1];
          }
          else if (step[0] == -1 && step[1] == 1) {
            if (i == 0) nextStep = [1, 1];
            else nextStep = [-1, -1];
          }
          else if (step[0] == 1 && step[1] == -1) {
            if (i == 6) nextStep = [-1, -1];
            else nextStep = [1, 1];
          }
          else {
            // step == [1, 1]
            if (j == 6) nextStep = [1, -1];
            else nextStep = [-1, 1];
          }
          i += nextStep[0];
          j += nextStep[1];
          while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
            moves.push(this.getBasicMove([x, y], [i, j]));
            i += nextStep[0];
            j += nextStep[1];
          }
          if (V.OnBoard(i, j) && this.getColor(i, j) != c)
            moves.push(this.getBasicMove([x, y], [i, j]));
        }
      }
    }
    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttackedByKing(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByPawn(sq, color)
    );
  }

  isAttackedByPawn([x, y], color) {
    // Determine zone, shifted according to pawn movement
    let attackDir = "";
    let forward = 0;
    if (
      ([1, 2, 3, 4].includes(x) && y <= 1) ||
      (x == 5 && y == 0)
    ) {
      attackDir = "vertical";
      forward = 1;
    }
    else if (
      ([2, 3, 4, 5].includes(x) && [5, 6].includes(y)) ||
      (x == 1 && y == 6)
    ) {
      attackDir = "vertical";
      forward = -1;
    }
    else if (
      (x <= 1 && [2, 3, 4, 5].includes(y)) ||
      (x == 0 && y == 1)
    ) {
      attackDir = "horizontal";
      forward = -1;
    }
    else if (
      (x >= 5 && [1, 2, 3, 4].includes(y)) ||
      (x == 6 && y == 5)
    ) {
      attackDir = "horizontal";
      forward = 1;
    }
    if (forward != 0) {
      const steps =
        attackDir == "vertical"
          ? [ [forward, -1], [forward, 0], [forward, 1] ]
          : [ [-1, forward], [0, forward], [1, forward] ];
      return (
        super.isAttackedBySlideNJump([x, y], color, V.PAWN, steps, 1)
      );
    }
    // In a corner: can be attacked by one square only
    let step = null;
    if (x == 0) {
      if (y == 0) step = [1, 0];
      else step = [0, -1];
    }
    else {
      if (y == 0) step = [0, 1];
      else step = [-1, 0];
    }
    return (
      super.isAttackedBySlideNJump([x, y], color, V.PAWN, [step], 1)
    );
  }

  isAttackedByRook([x, y], color) {
    // "Reversing" the code of getPotentialRookMoves()
    let multiStep = [],
        oneStep = [];
    if (x <= 1) multiStep.push([0, -1]);
    else oneStep.push([0, -1]);
    if (y <= 1) multiStep.push([1, 0]);
    else oneStep.push([1, 0]);
    if (x >= 5) multiStep.push([0, 1]);
    else oneStep.push([0, 1]);
    if (y >= 5) multiStep.push([-1, 0]);
    else oneStep.push([-1, 0]);
    if (
      super.isAttackedBySlideNJump([x, y], color, V.ROOK, oneStep, 1)
    ) {
      return true;
    }
    for (let step of multiStep) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (this.getColor(i, j) == color && this.getPiece(i, j) == V.ROOK)
          return true;
      }
      else {
        i -= step[0];
        j -= step[1];
        if (i != x || j != y) {
          let nextStep = null;
          if (i == 0 && j == 0) nextStep = [1, 0];
          else if (i == 0 && j == 6) nextStep = [0, -1];
          else if (i == 6 && j == 6) nextStep = [-1, 0];
          else if (i == 6 && j == 0) nextStep = [0, 1];
          if (!!nextStep) {
            i += nextStep[0];
            j += nextStep[1];
            while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
              i += nextStep[0];
              j += nextStep[1];
            }
            if (
              V.OnBoard(i, j) &&
              this.getColor(i, j) == color &&
              this.getPiece(i, j) == V.ROOK
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  isAttackedByBishop([x, y], color) {
    // "Reversing" the code of getPotentiaBishopMoves()
    let multiStep = {};
    if (x <= 1) {
      multiStep["1_-1"] = [1, -1];
      multiStep["-1_-1"] = [-1, -1];
    }
    if (y <= 1) {
      multiStep["1_1"] = [1, 1];
      if (!multiStep["1_-1"]) multiStep["1_-1"] = [1, -1];
    }
    if (x >= 5) {
      multiStep["-1_1"] = [-1, 1];
      if (!multiStep["1_1"]) multiStep["1_1"] = [1, 1];
    }
    if (y >= 5) {
      if (!multiStep["-1_-1"]) multiStep["-1_-1"] = [-1, -1];
      if (!multiStep["-1_1"]) multiStep["-1_1"] = [-1, 1];
    }
    let oneStep = [];
    Object.keys(V.DictBishopSteps).forEach(str => {
      if (!multiStep[str]) oneStep.push(V.DictBishopSteps[str]);
    });
    if (
      super.isAttackedBySlideNJump([x, y], color, V.BISHOP, oneStep, 1)
    ) {
      return true;
    }
    for (let step of Object.values(multiStep)) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (this.getColor(i, j) == color && this.getPiece(i, j) == V.BISHOP)
          return true;
      }
      else {
        i -= step[0];
        j -= step[1];
        if (i != x || j != y) {
          let nextStep = null;
          if (step[0] == -1 && step[1] == -1) {
            if (j == 0) nextStep = [-1, 1];
            else nextStep = [1, -1];
          }
          else if (step[0] == -1 && step[1] == 1) {
            if (i == 0) nextStep = [1, 1];
            else nextStep = [-1, -1];
          }
          else if (step[0] == 1 && step[1] == -1) {
            if (i == 6) nextStep = [-1, -1];
            else nextStep = [1, 1];
          }
          else {
            // step == [1, 1]
            if (j == 6) nextStep = [1, -1];
            else nextStep = [-1, 1];
          }
          i += nextStep[0];
          j += nextStep[1];
          while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
            i += nextStep[0];
            j += nextStep[1];
          }
          if (
            V.OnBoard(i, j) &&
            this.getColor(i, j) == color &&
            this.getPiece(i, j) == V.BISHOP
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // The board is divided in areas determined by "distance to target"
  // A zone n+1 must be reached from a zone n.
  getKingZone([x, y], color) {
    if (color == 'w') {
      if (y >= 4) return -1; //"out of zone"
      if (y == 3 && [5, 6].includes(x)) return 0;
      if (x == 6) return 1;
      if (x == 5) return 2;
      if (x == 4) return 3;
      if (x == 3 || y == 0) return 4;
      if (y == 1) return 5;
      if (x == 0 || y == 2) return 6;
      return 7; //x == 1 && y == 3
    }
    // color == 'b':
    if (y <= 2) return -1; //"out of zone"
    if (y == 3 && [0, 1].includes(x)) return 0;
    if (x == 0) return 1;
    if (x == 1) return 2;
    if (x == 2) return 3;
    if (x == 3 || y == 6) return 4;
    if (y == 5) return 5;
    if (x == 6 || y == 4) return 6;
    return 7; //x == 5 && y == 3
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.vanish[0].p == V.KING) {
      const c = move.vanish[0].c;
      const z1 = this.getKingZone([move.vanish[0].x, move.vanish[0].y], c),
            z2 = this.getKingZone([move.appear[0].x, move.appear[0].y], c);
      if (
        z1 >= 0 && z2 >= 0 && z1 < z2 &&
        // There exist "zone jumps" (0 to 2 for example),
        // so the following test "flag >= z1" is required.
        this.kingFlags[c] >= z1 && this.kingFlags[c] < z2
      ) {
        this.kingFlags[c] = z2;
      }
    }
  }

  getCurrentScore() {
    const oppCol = V.GetOppCol(this.turn);
    if (this.kingFlags[oppCol] == 7) return (oppCol == 'w' ? "1-0" : "0-1");
    return super.getCurrentScore();
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          const piece = this.getPiece(i, j);
          if (piece != 'x') evaluation += sign * V.VALUES[piece];
        }
      }
    }
    // Taking flags into account in a rather naive way
    return evaluation + this.kingFlags['w'] - this.kingFlags['b'];
  }

};
