import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class ApocalypseRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        twoSquares: false,
        promotions: [V.KNIGHT]
      }
    );
  }

  static get HasCastle() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get CanAnalyze() {
    return false;
  }

  static get ShowMoves() {
    return "byrow";
  }

  static get PIECES() {
    return [V.PAWN, V.KNIGHT];
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    // At least one pawn per color
    let pawns = { "p": 0, "P": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['P','p'].includes(row[i])) pawns[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(pawns).some(v => v == 0))
      return false;
    return true;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 4) Check whiteMove
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

  static IsGoodFlags(flags) {
    return !!flags.match(/^[0-2]{2,2}$/);
  }

  aggregateFlags() {
    return this.penaltyFlags;
  }

  disaggregateFlags(flags) {
    this.penaltyFlags = flags;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { whiteMove: fenParts[4] }
    );
  }

  static get size() {
    return { x: 5, y: 5 };
  }

  static GenRandInitFen() {
    return "npppn/p3p/5/P3P/NPPPN w 0 00 -";
  }

  getFen() {
    return super.getFen() + " " + this.getWhitemoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getWhitemoveFen();
  }

  getFlagsFen() {
    return this.penaltyFlags.join("");
  }

  setOtherVariables(fen) {
    const parsedFen = V.ParseFen(fen);
    this.setFlags(parsedFen.flags);
    // Also init whiteMove
    this.whiteMove =
      parsedFen.whiteMove != "-"
        ? JSON.parse(parsedFen.whiteMove)
        : null;
  }

  setFlags(fenflags) {
    this.penaltyFlags = [0, 1].map(i => parseInt(fenflags[i]));
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

  getSpeculations(moves, sq) {
    let moveSet = {};
    moves.forEach(m => {
      const mHash = "m" + m.start.x + m.start.y + m.end.x + m.end.y;
      moveSet[mHash] = true;
    });
    const color = this.turn;
    this.turn = V.GetOppCol(color);
    const oppMoves = super.getAllValidMoves();
    this.turn = color;
    // For each opponent's move, generate valid moves [from sq]
    let speculations = [];
    oppMoves.forEach(m => {
      V.PlayOnBoard(this.board, m);
      const newValidMoves =
        !!sq
          ? super.getPotentialMovesFrom(sq)
          : super.getAllValidMoves();
      newValidMoves.forEach(vm => {
        const mHash = "m" + vm.start.x + vm.start.y + vm.end.x + vm.end.y;
        if (!moveSet[mHash]) {
          moveSet[mHash] = true;
          vm.illegal = true; //potentially illegal!
          speculations.push(vm);
        }
      });
      V.UndoOnBoard(this.board, m);
    });
    return speculations;
  }

  getPossibleMovesFrom([x, y]) {
    const possibleMoves = super.getPotentialMovesFrom([x, y])
    // Augment potential moves with opponent's moves speculation:
    return possibleMoves.concat(this.getSpeculations(possibleMoves, [x, y]));
  }

  getAllValidMoves() {
    // Return possible moves + potentially valid moves
    const validMoves = super.getAllValidMoves();
    return validMoves.concat(this.getSpeculations(validMoves));
  }

  addPawnMoves([x1, y1], [x2, y2], moves) {
    let finalPieces = [V.PAWN];
    const color = this.turn;
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    if (x2 == lastRank) {
      // If 0 or 1 horsemen, promote in knight
      let knightCounter = 0;
      let emptySquares = [];
      for (let i=0; i<V.size.x; i++) {
        for (let j=0; j<V.size.y; j++) {
          if (this.board[i][j] == V.EMPTY) emptySquares.push([i, j]);
          else if (
            this.getColor(i, j) == color &&
            this.getPiece(i, j) == V.KNIGHT
          ) {
            knightCounter++;
          }
        }
      }
      if (knightCounter <= 1) finalPieces = [V.KNIGHT];
      else {
        // Generate all possible landings
        emptySquares.forEach(sq => {
          if (sq[0] != lastRank)
            moves.push(this.getBasicMove([x1, y1], [sq[0], sq[1]]));
        });
        return;
      }
    }
    let tr = null;
    for (let piece of finalPieces) {
      tr = (piece != V.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  filterValid(moves) {
    // No checks:
    return moves;
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
    let m = [this.whiteMove, move];
    for (let i of [0, 1]) {
      if (!!m[i].illegal) {
        // Either an anticipated capture of something which didn't move
        // (or not to the right square), or a push through blocus.
        if (
          (
            // Push attempt
            m[i].start.y == m[i].end.y &&
            (m[1-i].start.x != m[i].end.x || m[1-i].start.y != m[i].end.y)
          )
          ||
          (
            // Capture attempt
            Math.abs(m[i].start.y - m[i].end.y) == 1 &&
            (m[1-i].end.x != m[i].end.x || m[1-i].end.y != m[i].end.y)
          )
        ) {
          // Just discard the move, and add a penalty point
          this.penaltyFlags[m[i].vanish[0].c]++;
          m[i] = null;
        }
      }
    }

    // For PlayOnBoard (no need for start / end, irrelevant)
    let smove = {
      appear: [],
      vanish: []
    };
    const m1 = m[0],
          m2 = m[1];
    // If one move is illegal, just execute the other
    if (!m1 && !!m2) return m2;
    if (!m2 && !!m1) return m1;
    if (!m1 && !m2) return smove;
    // Both move are now legal:
    smove.vanish.push(m1.vanish[0]);
    smove.vanish.push(m2.vanish[0]);
    if ((m1.end.x != m2.end.x) || (m1.end.y != m2.end.y)) {
      // Easy case: two independant moves
      smove.appear.push(m1.appear[0]);
      smove.appear.push(m2.appear[0]);
      // "Captured" pieces may have moved:
      if (
        m1.vanish.length == 2 &&
        (
          m1.vanish[1].x != m2.start.x ||
          m1.vanish[1].y != m2.start.y
        )
      ) {
        smove.vanish.push(m1.vanish[1]);
      }
      if (
        m2.vanish.length == 2 &&
        (
          m2.vanish[1].x != m1.start.x ||
          m2.vanish[1].y != m1.start.y
        )
      ) {
        smove.vanish.push(m2.vanish[1]);
      }
    } else {
      // Collision: both disappear except if different kinds (knight remains)
      const p1 = m1.vanish[0].p;
      const p2 = m2.vanish[0].p;
      if ([p1, p2].includes(V.KNIGHT) && [p1, p2].includes(V.PAWN)) {
        smove.appear.push({
          x: m1.end.x,
          y: m1.end.y,
          p: V.KNIGHT,
          c: (p1 == V.KNIGHT ? 'w' : 'b')
        });
      }
    }
    return smove;
  }

  play(move) {
    // Do not play on board (would reveal the move...)
    move.flags = JSON.stringify(this.aggregateFlags());
    this.turn = V.GetOppCol(this.turn);
    this.movesCount++;
    this.postPlay(move);
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
    move.smove = smove;
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    if (this.turn == 'w')
      // Back to the middle of the move
      V.UndoOnBoard(this.board, move.smove);
    this.turn = V.GetOppCol(this.turn);
    this.movesCount--;
    this.postUndo(move);
  }

  postUndo(move) {
    if (this.turn == 'w') this.whiteMove = null;
    else this.whiteMove = move.whiteMove;
  }

  getCheckSquares(color) {
    return [];
  }

  getCurrentScore() {
    if (this.turn == 'b')
      // Turn (white + black) not over yet
      return "*";
    // Count footmen: if a side has none, it loses
    let fmCount = { 'w': 0, 'b': 0 };
    for (let i=0; i<5; i++) {
      for (let j=0; j<5; j++) {
        if (this.board[i][j] != V.EMPTY && this.getPiece(i, j) == V.PAWN)
          fmCount[this.getColor(i, j)]++;
      }
    }
    if (Object.values(fmCount).some(v => v == 0)) {
      if (fmCount['w'] == 0 && fmCount['b'] == 0)
        // Everyone died
        return "1/2";
      if (fmCount['w'] == 0) return "0-1";
      return "1-0"; //fmCount['b'] == 0
    }
    // Check penaltyFlags: if a side has 2 or more, it loses
    if (this.penaltyFlags.every(f => f == 2)) return "1/2";
    if (this.penaltyFlags[0] == 2) return "0-1";
    if (this.penaltyFlags[1] == 2) return "1-0";
    if (!this.atLeastOneMove('w') || !this.atLeastOneMove('b'))
      // Stalemate (should be very rare)
      return "1/2";
    return "*";
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
    // Basic system: piece + init + dest square
    return (
      move.vanish[0].p.toUpperCase() +
      V.CoordsToSquare(move.start) +
      V.CoordsToSquare(move.end)
    );
  }
};
