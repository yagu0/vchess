import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class Synchrone1Rules extends ChessRules {

  static get CanAnalyze() {
    return false;
  }

  static get ShowMoves() {
    return "byrow";
  }

  static get SomeHiddenMoves() {
    return true;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check whiteMove
    if (
      (
        fenParsed.turn == "b" &&
        // NOTE: do not check really JSON stringified move...
        (!fenParsed.whiteMove || fenParsed.whiteMove == "-")
      )
      ||
      (fenParsed.turn == "w" && fenParsed.whiteMove != "-")
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
      { whiteMove: fenParts[5] },
      ChessRules.ParseFen(fen)
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
    this.scanKings();
    // Also init whiteMove
    this.whiteMove =
      parsedFen.whiteMove != "-"
        ? JSON.parse(parsedFen.whiteMove)
        : null;
  }

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

  getPossibleMovesFrom([x, y]) {
    let moves = this.filterValid(super.getPotentialMovesFrom([x, y]));
    if (!this.underCheck(this.getColor(x, y)))
      // Augment with potential recaptures, except if we are under check
      Array.prototype.push.apply(moves, this.getRecaptures([x, y]));
    return moves;
  }

  // Aux function used to find opponent and self captures
  getCaptures(from, to, color) {
    const sliderAttack = (xx, yy, allowedSteps) => {
      const deltaX = xx - to[0],
            absDeltaX = Math.abs(deltaX);
      const deltaY = yy - to[1],
            absDeltaY = Math.abs(deltaY);
      const step = [ deltaX / absDeltaX || 0, deltaY / absDeltaY || 0 ];
      if (
        // Check that the step is a priori valid:
        (absDeltaX != absDeltaY && deltaX != 0 && deltaY != 0) ||
        allowedSteps.every(st => st[0] != step[0] || st[1] != step[1])
      ) {
        return null;
      }
      let sq = [ to[0] + step[0], to[1] + step[1] ];
      while (sq[0] != xx || sq[1] != yy) {
        // NOTE: no need to check OnBoard in this special case
        if (this.board[sq[0]][sq[1]] != V.EMPTY) return null;
        sq[0] += step[0];
        sq[1] += step[1];
      }
      return this.getBasicMove([xx, yy], [to[0], to[1]]);
    };
    // Can I take on the square 'to' ?
    // If yes, return the (list of) capturing move(s)
    const getTargetedCaptures = ([i, j]) => {
      let move = null;
      // From [i, j]:
      switch (this.getPiece(i, j)) {
        case V.PAWN: {
          // Pushed pawns move as enemy pawns
          const shift = (color == 'w' ? 1 : -1);
          if (to[0] + shift == i && Math.abs(to[1] - j) == 1)
            move = this.getBasicMove([i, j], to);
          break;
        }
        case V.KNIGHT: {
          const deltaX = Math.abs(i - to[0]);
          const deltaY = Math.abs(j - to[1]);
          if (
            deltaX + deltaY == 3 &&
            [1, 2].includes(deltaX) &&
            [1, 2].includes(deltaY)
          ) {
            move = this.getBasicMove([i, j], to);
          }
          break;
        }
        case V.KING:
          if (Math.abs(i - to[0]) <= 1 && Math.abs(j - to[1]) <= 1)
            move = this.getBasicMove([i, j], to);
          break;
        case V.ROOK: {
          move = sliderAttack(i, j, V.steps[V.ROOK]);
          break;
        }
        case V.BISHOP: {
          move = sliderAttack(i, j, V.steps[V.BISHOP]);
          break;
        }
        case V.QUEEN: {
          move = sliderAttack(i, j, V.steps[V.ROOK].concat(V.steps[V.BISHOP]));
          break;
        }
      }
      return move;
    };
    let moves = [];
    if (!!from) {
      const theMove = getTargetedCaptures(from);
      if (!!theMove) moves.push(theMove);
    }
    else {
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.getColor(i, j) == color) {
            const newMove = getTargetedCaptures([i, j]);
            if (!!newMove) moves.push(newMove);
          }
        }
      }
    }
    return this.filterValid(moves);
  }

  getRecaptures(from) {
    // 1) Generate all opponent's capturing moves
    let oppCaptureMoves = [];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.getColor(i, j) == color &&
          // Do not consider king captures: self-captures of king are forbidden
          this.getPiece(i, j) != V.KING
        ) {
          Array.prototype.push.apply(
            oppCaptureMoves,
            this.getCaptures(null, [i, j], oppCol)
          );
        }
      }
    }
    // 2) Play each opponent's capture, and see if back-captures are possible:
    // Lookup table to quickly decide if a move is already in list:
    let moveSet = {};
    let moves = [];
    oppCaptureMoves.forEach(m => {
      // If another opponent capture with same endpoint already processed, skip
      const mHash = "m" + m.end.x + m.end.y;
      if (!moveSet[mHash]) {
        moveSet[mHash] = true;
        // Just make enemy piece disappear, to clear potential path:
        const justDisappear = {
          appear: [],
          vanish: [m.vanish[0]]
        };
        V.PlayOnBoard(this.board, justDisappear);
        // Can I take on [m.end.x, m.end.y] ? If yes, add to list:
        this.getCaptures(from, [m.end.x, m.end.y], color)
          .forEach(cm => moves.push(cm));
        V.UndoOnBoard(this.board, justDisappear);
      }
    });
    return moves;
  }

  getAllValidMoves() {
    // Return possible moves + potential recaptures
    return super.getAllValidMoves().concat(this.getRecaptures());
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
      if (m1.appear.length == 2) {
        // Castle
        smove.appear.push(m1.appear[1]);
        smove.vanish.push(m1.vanish[1]);
      }
      else if (
        m1.vanish.length == 2 &&
        (
          m1.vanish[1].x != m2.start.x ||
          m1.vanish[1].y != m2.start.y
        )
      ) {
        smove.vanish.push(m1.vanish[1]);
      }
      if (m2.appear.length == 2) {
        // Castle
        smove.appear.push(m2.appear[1]);
        smove.vanish.push(m2.vanish[1]);
      }
      else if (
        m2.vanish.length == 2 &&
        (
          m2.vanish[1].x != m1.start.x ||
          m2.vanish[1].y != m1.start.y
        )
      ) {
        smove.vanish.push(m2.vanish[1]);
      }
    }
    else {
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
      }
      else {
        // One move is a self-capture and the other a normal capture:
        // only the self-capture appears
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
        smove.vanish.push({
          x: m1.end.x,
          y: m1.end.y,
          p: selfCaptureMove.vanish[1].p,
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
    move.whiteMove = this.whiteMove; //for undo
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
    if (this.turn == 'w') {
      // Reset king positions: scan board
      this.scanKings();
      // Also reset whiteMove
      this.whiteMove = null;
    }
    else this.whiteMove = move.whiteMove;
  }

  getCheckSquares() {
    const color = this.turn;
    if (color == 'b') {
      // kingPos must be reset for appropriate highlighting:
      var lastMove = JSON.parse(JSON.stringify(this.whiteMove));
      this.undo(lastMove); //will erase whiteMove, thus saved above
    }
    let res = [];
    if (this.kingPos['w'][0] >= 0 && this.underCheck('w'))
      res.push(JSON.parse(JSON.stringify(this.kingPos['w'])));
    if (this.kingPos['b'][0] >= 0 && this.underCheck('b'))
      res.push(JSON.parse(JSON.stringify(this.kingPos['b'])));
    if (color == 'b') this.play(lastMove);
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

  getNotation(move) {
    if (move.appear.length == 2 && move.appear[0].p == V.KING)
      // Castle
      return move.end.y < move.start.y ? "0-0-0" : "0-0";
    // Basic system: piece + init + dest square
    return (
      move.vanish[0].p.toUpperCase() +
      V.CoordsToSquare(move.start) +
      V.CoordsToSquare(move.end)
    );
  }

};
