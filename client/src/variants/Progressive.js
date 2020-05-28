import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class ProgressiveRules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    return moves.filter(m => {
      // Not using this.play() (would result ininfinite recursive calls)
      V.PlayOnBoard(this.board, m);
      if (m.appear[0].p == V.KING)
        this.kingPos[color] = [m.appear[0].x, m.appear[0].y];
      const res = !this.underCheck(color);
      V.UndoOnBoard(this.board, m);
      if (m.appear[0].p == V.KING)
        this.kingPos[color] = [m.vanish[0].x, m.vanish[0].y];
      return res;
    });
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    move.turn = [color, this.subTurn];
    V.PlayOnBoard(this.board, move);
    if (
      this.subTurn > this.movesCount ||
      this.underCheck(oppCol) ||
      !this.atLeastOneMove()
    ) {
      this.turn = oppCol;
      this.subTurn = 1;
      this.movesCount++;
    }
    else this.subTurn++;
    this.postPlay(move);
  }

  postPlay(move) {
    const c = move.turn[0];
    const piece = move.vanish[0].p;
    const firstRank = c == "w" ? V.size.x - 1 : 0;

    if (piece == V.KING && move.appear.length > 0) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [V.size.y, V.size.y];
      return;
    }
    const oppCol = V.GetOppCol(c);
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    if (
      move.end.x == oppFirstRank && //we took opponent rook?
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.turn != move.turn[0]) this.movesCount--;
    this.turn = move.turn[0];
    this.subTurn = move.turn[1];
    super.postUndo(move);
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 7, //slightly less than in orthodox game
      k: 1000
    };
  }

  // Random moves (too high branching factor otherwise). TODO
  getComputerMove() {
    let res = [];
    const color = this.turn;
    while (this.turn == color) {
      const moves = this.getAllValidMoves();
      const m = moves[randInt(moves.length)];
      res.push(m);
      this.play(m);
    }
    for (let i=res.length - 1; i>= 0; i--) this.undo(res[i]);
    return res;
  }
};
