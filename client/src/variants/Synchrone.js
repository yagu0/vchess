// TODO: debug, and forbid self-capture of king.

import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class SynchroneRules extends ChessRules {
  static get CanAnalyze() {
    return true; //false;
  }

  static get ShowMoves() {
    return "byrow";
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check whiteMove
    if (
      (
        fenParsed.turn == "w" &&
        // NOTE: do not check really JSON stringified move...
        (!fenParsed.whiteMove || fenParsed.whiteMove == "-")
      )
      ||
      (fenParsed.turn == "b" && fenParsed.whiteMove != "-")
    ) {
      return false;
    }
    return true;
  }

  static IsGoodEnpassant(enpassant) {
    const epArray = enpassant.split(",");
    if (![2, 3].includes(epArray.length)) return false;
    epArray.forEach(epsq => {
      if (epsq != "-") {
        const ep = V.SquareToCoords(epsq);
        if (isNaN(ep.x) || !V.OnBoard(ep)) return false;
      }
    });
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { whiteMove: fenParts[5] }
    );
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness).slice(0, -1) + "-,- -";
  }

  getFen() {
    return super.getFen() + " " + this.getWhitemoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getWhitemoveFen();
  }

  setOtherVariables(fen) {
    const parsedFen = V.ParseFen(fen);
    this.setFlags(parsedFen.flags);
    const epArray = parsedFen.enpassant.split(",");
    this.epSquares = [];
    epArray.forEach(epsq => this.epSquares.push(this.getEpSquare(epsq)));
    super.scanKings(fen);
    // Also init whiteMove
    this.whiteMove =
      parsedFen.whiteMove != "-"
        ? JSON.parse(parsedFen.whiteMove)
        : null;
  }

  // After undo(): no need to re-set INIT_COL_KING
  scanKings() {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.getPiece(i, j) == V.KING)
          this.kingPos[this.getColor(i, j)] = [i, j];
      }
    }
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    let res = "";
    const start = L - 2 - (this.turn == 'b' ? 1 : 0);
    for (let i=start; i < L; i++) {
      if (!this.epSquares[i]) res += "-,";
      else res += V.CoordsToSquare(this.epSquares[i]) + ",";
    }
    return res.slice(0, -1);
  }

  getWhitemoveFen() {
    if (!this.whiteMove) return "-";
    return JSON.stringify({
      start: this.whiteMove.start,
      end: this.whiteMove.end,
      appear: this.whiteMove.appear,
      vanish: this.whiteMove.vanish
    });
  }

  // NOTE: lazy unefficient implementation (for now. TODO?)
  getPossibleMovesFrom([x, y]) {
    const moves = this.getAllValidMoves();
    return moves.filter(m => {
      return m.start.x == x && m.start.y == y;
    });
  }

  getCaptures(x, y) {
    const color = this.turn;
    const sliderAttack = (xx, yy, allowedSteps) => {
      const deltaX = xx - x,
            absDeltaX = Math.abs(deltaX);
      const deltaY = yy - y,
            absDeltaY = Math.abs(deltaY);
      const step = [ deltaX / absDeltaX || 0, deltaY / absDeltaY || 0 ];
      if (
        // Check that the step is a priori valid:
        (absDeltaX != absDeltaY && deltaX != 0 && deltaY != 0) ||
        allowedSteps.every(st => st[0] != step[0] || st[1] != step[1])
      ) {
        return null;
      }
      let sq = [ x + step[0], y + step[1] ];
      while (sq[0] != xx || sq[1] != yy) {
        // NOTE: no need to check OnBoard in this special case
        if (this.board[sq[0]][sq[1]] != V.EMPTY) return null;
        sq[0] += step[0];
        sq[1] += step[1];
      }
      return this.getBasicMove([xx, yy], [x, y]);
    };
    // Can I take on the square [x, y] ?
    // If yes, return the (list of) capturing move(s)
    let moves = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.getColor(i, j) == color) {
          switch (this.getPiece(i, j)) {
            case V.PAWN: {
              // Pushed pawns move as enemy pawns
              const shift = (color == 'w' ? 1 : -1);
              if (x + shift == i && Math.abs(y - j) == 1)
                moves.push(this.getBasicMove([i, j], [x, y]));
              break;
            }
            case V.KNIGHT: {
              const deltaX = Math.abs(i - x);
              const deltaY = Math.abs(j - y);
              if (
                deltaX + deltaY == 3 &&
                [1, 2].includes(deltaX) &&
                [1, 2].includes(deltaY)
              ) {
                moves.push(this.getBasicMove([i, j], [x, y]));
              }
              break;
            }
            case V.KING:
              if (Math.abs(i - x) <= 1 && Math.abs(j - y) <= 1)
                moves.push(this.getBasicMove([i, j], [x, y]));
              break;
            case V.ROOK: {
              const mv = sliderAttack(i, j, V.steps[V.ROOK]);
              if (!!mv) moves.push(mv);
              break;
            }
            case V.BISHOP: {
              const mv = sliderAttack(i, j, V.steps[V.BISHOP]);
              if (!!mv) moves.push(mv);
              break;
            }
            case V.QUEEN: {
              const mv = sliderAttack(
                i, j, V.steps[V.ROOK].concat(V.steps[V.BISHOP]));
              if (!!mv) moves.push(mv);
              break;
            }
          }
        }
      }
    }
    return this.filterValid(moves);
  }

  getAllValidMoves() {
    const color = this.turn;
    // 0) Generate our possible moves
    let myMoves = super.getAllValidMoves();
    // Lookup table to quickly decide if a move is already in list:
    let moveSet = {};
    const getMoveHash = (move) => {
      return (
        "m" + move.start.x + move.start.y +
              move.end.x + move.end.y +
              // Also use m.appear[0].p for pawn promotions
              move.appear[0].p
      );
    };
    myMoves.forEach(m => moveSet[getMoveHash(m)] = true);
    // 1) Generate all opponent's moves
    this.turn = V.GetOppCol(color);
    const oppMoves = super.getAllValidMoves();
    this.turn = color;
    // 2) Play each opponent's move, and see if captures are possible:
    // --> capturing moving unit only (otherwise some issues)
    oppMoves.forEach(m => {
      V.PlayOnBoard(this.board, m);
      // Can I take on [m.end.x, m.end.y] ?
      // If yes and not already in list, add it (without the capturing part)
      let capturingMoves = this.getCaptures(m.end.x, m.end.y);
      capturingMoves.forEach(cm => {
        const cmHash = getMoveHash(cm);
        if (!moveSet[cmHash]) {
          // The captured unit hasn't moved yet, so temporarily cancel capture
          cm.vanish.pop();
          // If m is itself a capturing move: then replace by self-capture
          if (m.vanish.length == 2) cm.vanish.push(m.vanish[1]);
          myMoves.push(cm);
          moveSet[cmHash] = true;
        }
      });
      V.UndoOnBoard(this.board, m);
    });
    return myMoves;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    // filterValid can be called when it's "not our turn":
    const color = moves[0].vanish[0].c;
    return moves.filter(m => {
      const piece = m.vanish[0].p;
      if (piece == V.KING) {
        this.kingPos[color][0] = m.appear[0].x;
        this.kingPos[color][1] = m.appear[0].y;
      }
      V.PlayOnBoard(this.board, m);
      let res = !this.underCheck(color);
      V.UndoOnBoard(this.board, m);
      if (piece == V.KING) this.kingPos[color] = [m.start.x, m.start.y];
      return res;
    });
  }

  atLeastOneMove(color) {
    const curTurn = this.turn;
    this.turn = color;
    const res = super.atLeastOneMove();
    this.turn = curTurn;
    return res;
  }

  // White and black (partial) moves were played: merge
  resolveSynchroneMove(move) {
    const m1 = this.whiteMove;
    const m2 = move;
    // For PlayOnBoard (no need for start / end, irrelevant)
    let smove = {
      appear: [],
      vanish: [
        m1.vanish[0],
        m2.vanish[0]
      ]
    };
    if ((m1.end.x != m2.end.x) || (m1.end.y != m2.end.y)) {
      // Easy case: two independant moves (which may (self-)capture)
      smove.appear.push(m1.appear[0]);
      smove.appear.push(m2.appear[0]);
      // "Captured" pieces may have moved:
      if (
        m1.vanish.length == 2 &&
        (
          m2.end.x != m1.vanish[1].x ||
          m2.end.y != m1.vanish[1].y
        )
      ) {
        smove.vanish.push(m1.vanish[1]);
      }
      if (
        m2.vanish.length == 2 &&
        (
          m1.end.x != m2.vanish[1].x ||
          m1.end.y != m2.vanish[1].y
        )
      ) {
        smove.vanish.push(m2.vanish[1]);
      }
    } else {
      // Collision:
      if (m1.vanish.length == 1 && m2.vanish.length == 1) {
        // Easy case: both disappear except if one is a king
        const p1 = m1.vanish[0].p;
        const p2 = m2.vanish[0].p;
        if ([p1, p2].includes(V.KING)) {
          smove.appear.push({
            x: m1.end.x,
            y: m1.end.y,
            p: V.KING,
            c: (p1 == V.KING ? 'w' : 'b')
          });
        }
      } else {
        // One move is a self-capture and the other a normal capture:
        // only the self-capture appears
        console.log(m1);
        console.log(m2);
        const selfCaptureMove =
          m1.vanish[1].c == m1.vanish[0].c
            ? m1
            : m2;
        smove.appear.push({
          x: m1.end.x,
          y: m1.end.y,
          p: selfCaptureMove.appear[0].p,
          c: selfCaptureMove.vanish[0].c
        });
      }
    }
    return smove;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags()); //save flags (for undo)
    this.epSquares.push(this.getEpSquare(move));
    // Do not play on board (would reveal the move...)
    this.turn = V.GetOppCol(this.turn);
    this.movesCount++;
    this.postPlay(move);
  }

  updateCastleFlags(move) {
    const firstRank = { 'w': V.size.x - 1, 'b': 0 };
    move.appear.concat(move.vanish).forEach(av => {
      for (let c of ['w', 'b']) {
        if (av.x == firstRank[c] && this.castleFlags[c].includes(av.y)) {
          const flagIdx = (av.y == this.castleFlags[c][0] ? 0 : 1);
          this.castleFlags[c][flagIdx] = 8;
        }
      }
    });
  }

  postPlay(move) {
    if (this.turn == 'b') {
      // NOTE: whiteMove is used read-only, so no need to copy
      this.whiteMove = move;
      return;
    }

    // A full turn just ended:
    const smove = this.resolveSynchroneMove(move);
    V.PlayOnBoard(this.board, smove);
    this.whiteMove = null;

    // Update king position + flags
    let kingAppear = { 'w': false, 'b': false };
    for (let i=0; i<smove.appear.length; i++) {
      if (smove.appear[i].p == V.KING) {
        const c = smove.appear[i].c;
        kingAppear[c] = true;
        this.kingPos[c][0] = smove.appear[i].x;
        this.kingPos[c][1] = smove.appear[i].y;
      }
    }
    for (let i=0; i<smove.vanish.length; i++) {
      if (smove.vanish[i].p == V.KING) {
        const c = smove.vanish[i].c;
        if (!kingAppear[c]) {
          this.kingPos[c][0] = -1;
          this.kingPos[c][1] = -1;
        }
        break;
      }
    }
    this.updateCastleFlags(smove);
    move.smove = smove;
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    if (this.turn == 'w')
      // Back to the middle of the move
      V.UndoOnBoard(this.board, move.smove);
    this.turn = V.GetOppCol(this.turn);
    this.movesCount--;
    this.postUndo(move);
  }

  postUndo(move) {
    if (this.turn == 'w')
      // Reset king positions: scan board
      this.scanKings();
  }

  getCheckSquares(color) {
    if (color == 'b') return [];
    let res = [];
    if (this.underCheck('w'))
      res.push(JSON.parse(JSON.stringify(this.kingPos['w'])));
    if (this.underCheck('b'))
      res.push(JSON.parse(JSON.stringify(this.kingPos['b'])));
    return res;
  }

  getCurrentScore() {
    if (this.turn == 'b')
      // Turn (white + black) not over yet
      return "*";
    // Was a king captured?
    if (this.kingPos['w'][0] < 0) return "0-1";
    if (this.kingPos['b'][0] < 0) return "1-0";
    const whiteCanMove = this.atLeastOneMove('w');
    const blackCanMove = this.atLeastOneMove('b');
    if (whiteCanMove && blackCanMove) return "*";
    // Game over
    const whiteInCheck = this.underCheck('w');
    const blackInCheck = this.underCheck('b');
    if (
      (whiteCanMove && !this.underCheck('b')) ||
      (blackCanMove && !this.underCheck('w'))
    ) {
      return "1/2";
    }
    // Checkmate: could be mutual
    if (!whiteCanMove && !blackCanMove) return "1/2";
    return (whiteCanMove ? "1-0" : "0-1");
  }

  getComputerMove() {
    const maxeval = V.INFINITY;
    const color = this.turn;
    let moves = this.getAllValidMoves();
    if (moves.length == 0)
      // TODO: this situation should not happen
      return null;

    if (Math.random() < 0.5)
      // Return a random move
      return moves[randInt(moves.length)];

    // Rank moves at depth 1:
    // try to capture something (not re-capturing)
    moves.forEach(m => {
      V.PlayOnBoard(this.board, m);
      m.eval = this.evalPosition();
      V.UndoOnBoard(this.board, m);
    });
    moves.sort((a, b) => {
      return (color == "w" ? 1 : -1) * (b.eval - a.eval);
    });
    let candidates = [0];
    for (let i = 1; i < moves.length && moves[i].eval == moves[0].eval; i++)
      candidates.push(i);
    return moves[candidates[randInt(candidates.length)]];
  }
};
