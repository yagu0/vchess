import { ChessRules } from "@/base_rules";

export class PawnskingRules extends ChessRules {

  static get Options() {
    return null;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      // The promotion piece doesn't matter, the game is won
      { promotions: [V.QUEEN] }
    );
  }

  static get HasFlags() {
    return false;
  }

  static GenRandInitFen() {
    return "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w 0 -";
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.kingPos[color][0] < 0) return (color == "w" ? "0-1" : "1-0");
    const oppCol = V.GetOppCol(color);
    const lastRank = (oppCol == 'w' ? 0 : 7);
    if (this.board[lastRank].some(cell => cell[0] == oppCol))
      // The opposing edge is reached!
      return (oppCol == "w" ? "1-0" : "0-1");
    if (this.atLeastOneMove()) return "*";
    return "1/2";
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[this.turn] = [-1, -1];
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

};
