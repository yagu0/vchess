import { ChessRules, Move } from "@/base_rules";
import { Synchrone1Rules } from "@/variants/Synchrone1";
import { randInt } from "@/utils/alea";

export class Synchrone2Rules extends Synchrone1Rules {

  static get CanAnalyze() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static IsGoodFen(fen) {
    if (!Synchrone1Rules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check initFen (not really... TODO?)
    if (!fenParsed.initFen) return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      {
        initFen: fenParts[4],
        whiteMove: fenParts[5]
      },
      ChessRules.ParseFen(fen)
    );
  }

  getInitfenFen() {
    const L = this.initfenStack.length;
    return L > 0 ? this.initfenStack[L-1] : "-";
  }

  getFen() {
    return (
      super.getBaseFen() + " " +
      super.getTurnFen() + " " +
      this.movesCount + " " +
      super.getFlagsFen() + " " +
      this.getInitfenFen() + " " +
      this.getWhitemoveFen()
    );
  }

  static GenRandInitFen(randomness) {
    const res = ChessRules.GenRandInitFen(randomness);
    // Add initFen field:
    return res.slice(0, -1) + res.split(' ')[0] + " -";
  }

  setOtherVariables(fen) {
    const parsedFen = V.ParseFen(fen);
    this.setFlags(parsedFen.flags);
    super.scanKings(fen);
    // Also init whiteMove
    this.whiteMove =
      parsedFen.whiteMove != "-"
        ? JSON.parse(parsedFen.whiteMove)
        : null;
    // And initFen (could be empty)
    this.initfenStack = [];
    if (parsedFen.initFen != "-") this.initfenStack.push(parsedFen.initFen);
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount % 4 <= 1) return super.getPotentialMovesFrom([x, y]);
    // Diff current and old board to know which pieces have moved,
    // and to deduce possible moves at stage 2.
    const L = this.initfenStack.length;
    let initBoard = V.GetBoard(this.initfenStack[L-1]);
    let appeared = [];
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != initBoard[i][j]) {
          if (this.board[i][j] != V.EMPTY) {
            const color = this.board[i][j].charAt(0);
            appeared.push({ c: color, x: i, y: j });
            // Pawns capture in diagonal => the following fix.
            // (Other way would be to redefine getPotentialPawnMoves()...)
            if (color == oppCol) initBoard[i][j] = this.board[i][j];
          }
        }
      }
    }
    const saveBoard = this.board;
    this.board = initBoard;
    const movesInit = super.getPotentialMovesFrom([x, y]);
    this.board = saveBoard;
    const target = appeared.find(a => a.c == oppCol);
    let movesNow = super.getPotentialMovesFrom([x, y]).filter(m => {
      return (
        m.end.x == target.x &&
        m.end.y == target.y &&
        movesInit.some(mi => mi.end.x == m.end.x && mi.end.y == m.end.y)
      );
    });
    const passTarget =
      (x != this.kingPos[c][0] || y != this.kingPos[c][1]) ? c : oppCol;
    movesNow.push(
      new Move({
        start: { x: x, y: y },
        end: {
          x: this.kingPos[passTarget][0],
          y: this.kingPos[passTarget][1]
        },
        appear: [],
        vanish: []
      })
    );
    return movesNow;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    if (moves.length == 1 && moves[0].vanish.length == 0) return moves;
    // filterValid can be called when it's "not our turn":
    const color = moves.find(m => m.vanish.length > 0).vanish[0].c;
    return moves.filter(m => {
      if (m.vanish.length == 0) return true;
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

  getPossibleMovesFrom([x, y]) {
    return this.filterValid(this.getPotentialMovesFrom([x, y]));
  }

  play(move) {
    if (this.movesCount % 4 == 0) this.initfenStack.push(this.getBaseFen());
    move.flags = JSON.stringify(this.aggregateFlags());
    // Do not play on board (would reveal the move...)
    this.turn = V.GetOppCol(this.turn);
    this.movesCount++;
    if ([0, 3].includes(this.movesCount % 4)) this.postPlay(move);
    else super.postPlay(move); //resolve synchrone move
  }

  postPlay(move) {
    if (this.turn == 'b') {
      // NOTE: whiteMove is used read-only, so no need to copy
      this.whiteMove = move;
      return;
    }

    // A full "deterministic" turn just ended: no need to resolve
    const smove = {
      appear: this.whiteMove.appear.concat(move.appear),
      vanish: this.whiteMove.vanish.concat(move.vanish)
    };
    V.PlayOnBoard(this.board, smove);
    move.whiteMove = this.whiteMove; //for undo
    this.whiteMove = null;

    // Update king position + flags
    let kingAppear = { 'w': false, 'b': false };
    for (let i=0; i < smove.appear.length; i++) {
      if (smove.appear[i].p == V.KING) {
        const c = smove.appear[i].c;
        kingAppear[c] = true;
        this.kingPos[c][0] = smove.appear[i].x;
        this.kingPos[c][1] = smove.appear[i].y;
      }
    }
    for (let i = 0; i < smove.vanish.length; i++) {
      if (smove.vanish[i].p == V.KING) {
        const c = smove.vanish[i].c;
        if (!kingAppear[c]) {
          this.kingPos[c][0] = -1;
          this.kingPos[c][1] = -1;
        }
        break;
      }
    }
    super.updateCastleFlags(smove);
    move.smove = smove;
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    if (this.turn == 'w')
      // Back to the middle of the move
      V.UndoOnBoard(this.board, move.smove);
    this.turn = V.GetOppCol(this.turn);
    this.movesCount--;
    if (this.movesCount % 4 == 0) this.initfenStack.pop();
    this.postUndo(move);
  }

  postUndo(move) {
    if (this.turn == 'w') {
      // Reset king positions: scan board (TODO: could be more efficient)
      if (move.vanish.length > 0) this.scanKings();
      // Also reset whiteMove
      this.whiteMove = null;
    }
    else this.whiteMove = move.whiteMove;
  }

  getCurrentScore() {
    if (this.movesCount % 4 != 0)
      // Turn (2 x [white + black]) not over yet
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

  getNotation(move) {
    if (move.vanish.length == 0) return "pass";
    return super.getNotation(move);
  }

};
