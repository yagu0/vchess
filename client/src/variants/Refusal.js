import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

// TODO: Two moves, both promoting the same pawn, but to a different type of piece, count as two different moves.
// ==> need to accept temporarily pawn promotions even if on forbidden square, and check afterward if promoted type changed (info in lastMove)

export class RefusalRules extends ChessRules {

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    if (!V.ParseFen(fen).lastMove) return false;
    return true;
  }

  static ParseFen(fen) {
    return Object.assign(
      { lastMove: fen.split(" ")[5] },
      ChessRules.ParseFen(fen)
    );
  }

  getFen() {
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    return super.getFen() + " " + JSON.stringify(lm);
  }

  // NOTE: with this variant's special rule,
  // some extra repetitions could be detected... TODO (...)

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness) + " null";
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.lastMove = [JSON.parse(V.ParseFen(fen).lastMove)]; //may be null
  }

  canIplay(side, [x, y]) {
    if (super.canIplay(side, [x, y])) return true;
    if (this.turn != side) return false;
    // Check if playing last move, reversed:
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    return (!!lm && !lm.noRef && x == lm.end.x && y == lm.end.y);
  }

  getPotentialMovesFrom([x, y]) {
    if (this.getColor(x, y) != this.turn) {
      const L = this.lastMove.length;
      const lm = this.lastMove[L-1];
      if (!!lm && !lm.noRef && x == lm.end.x && y == lm.end.y) {
        let revLm = JSON.parse(JSON.stringify(lm));
        let tmp = revLm.appear;
        revLm.appear = revLm.vanish;
        revLm.vanish = tmp;
        tmp = revLm.start;
        revLm.start = revLm.end;
        revLm.end = tmp;
        return [revLm];
      }
      return [];
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  // NOTE: do not take refusal move into account here (two own moves)
  atLeastTwoMoves() {
    let movesCounter = 0;
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          const moves = this.getPotentialMovesFrom([i, j]);
          for (let m of moves) {
            if (m.vanish[0].c == color && this.filterValid([m]).length > 0) {
              movesCounter++;
              if (movesCounter >= 2) return true;
            }
          }
        }
      }
    }
    return false;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    return moves.filter(m => {
      if (
        !!lm && !!lm.refusal &&
        m.start.x == lm.end.x && m.start.y == lm.end.y &&
        m.end.x == lm.start.x && m.end.y == lm.start.y
      ) {
        return false;
      }
      // NOTE: not using this.play()/undo() ==> infinite loop
      V.PlayOnBoard(this.board, m);
      if (m.appear[0].p == V.KING)
        this.kingPos[m.appear[0].c] = [m.appear[0].x, m.appear[0].y];
      const res = !this.underCheck(color);
      V.UndoOnBoard(this.board, m);
      if (m.vanish[0].p == V.KING)
        this.kingPos[m.vanish[0].c] = [m.vanish[0].x, m.vanish[0].y];
      return res;
    });
  }

  prePlay(move) {
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    if (
      // My previous move was already refused?
      (!!lm && this.getColor(lm.end.x, lm.end.y) == this.turn) ||
      // I've only one move available?
      !this.atLeastTwoMoves()
    ) {
      move.noRef = true;
    }
    // NOTE: refusal could be recomputed, but, it's easier like this
    if (move.vanish[0].c != this.turn) move.refusal = true;
  }

  getEpSquare(move) {
    if (!move.refusal) return super.getEpSquare(move);
    return null; //move refusal
  }

  postPlay(move) {
    if (!move.refusal) super.postPlay(move);
    else {
      const L = this.lastMove.length;
      const lm = this.lastMove[L-1];
      this.disaggregateFlags(JSON.parse(lm.flags));
    }
    // NOTE: explicitely give fields, because some are assigned in BaseGame
    let mvInLm = {
      start: move.start,
      end: move.end,
      appear: move.appear,
      vanish: move.vanish,
      flags: move.flags
    };
    if (!!move.noRef) mvInLm.noRef = true;
    if (!!move.refusal) mvInLm.refusal = true;
    this.lastMove.push(mvInLm);
  }

  postUndo(move) {
    if (!move.refusal) super.postUndo(move);
    this.lastMove.pop();
  }

  getAllPotentialMoves() {
    const color = this.turn;
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          (
            this.getColor(i, j) == color ||
            // Add move refusal:
            (!!lm && lm.end.x == i && lm.end.y == j)
          )
        ) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    return potentialMoves;
  }

  getComputerMove() {
    // Just play at random for now... (TODO?)
    // Refuse last move with odds 1/3.
    const moves = this.getAllValidMoves();
    const refusal = moves.find(m => m.vanish[0].c != this.turn);
    if (!!refusal) {
      if (Math.random() <= 0.33) return refusal;
      const others = moves.filter(m => m.vanish[0].c == this.turn);
      return others[randInt(others.length)];
    }
    else return moves[randInt(moves.length)];
  }

  getNotation(move) {
    if (move.vanish[0].c != this.turn) return "Refuse";
    return super.getNotation(move);
  }

};
