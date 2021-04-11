import { ChessRules, Move, PiPo } from "@/base_rules";
import { Antiking2Rules } from "@/variants/Antiking2";

export class JokerRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: ChessRules.PawnSpecs.promotions.concat([V.JOKER]) }
    );
  }

  static GenRandInitFen(randomness) {
    const antikingFen = Antiking2Rules.GenRandInitFen(randomness);
    return antikingFen.replace('a', 'J').replace('A', 'j');
  }

  static get JOKER() {
    return 'j';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.JOKER]);
  }

  getPpath(b) {
    return (b.charAt(1) == 'j' ? "Joker/" : "") + b;
  }

  getPotentialMovesFrom([x, y]) {
    const piece = this.getPiece(x, y);
    if (piece == V.JOKER) return this.getPotentialJokerMoves([x, y]);
    let moves = super.getPotentialMovesFrom([x, y]);
    if (piece == V.PAWN) {
      const c = this.turn;
      const alreadyOneJoker = this.board.some(row =>
        row.some(cell => cell == c + 'j'));
      if (alreadyOneJoker) moves = moves.filter(m => m.appear[0].p != V.JOKER)
    }
    return moves;
  }

  canTake([x1, y1], [x2, y2]) {
    if (this.getPiece(x1, y1) == V.JOKER) return false;
    return super.canTake([x1, y1], [x2, y2]);
  }

  getPotentialJokerMoves([x, y]) {
    const moving =
      super.getSlideNJumpMoves([x, y], V.steps[V.KNIGHT], "oneStep")
      .concat(super.getSlideNJumpMoves([x, y],
        V.steps[V.ROOK].concat(V.steps[V.BISHOP])));
    let swapping = [];
    const c = this.turn;
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        // Following test is OK because only one Joker on board at a time
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == c) {
          const p = this.getPiece(i, j);
          swapping.push(
            new Move({
              vanish: [
                new PiPo({ x: x, y: y, c: c, p: V.JOKER }),
                new PiPo({ x: i, y: j, c: c, p: p })
              ],
              appear: [
                new PiPo({ x: i, y: j, c: c, p: V.JOKER }),
                new PiPo({ x: x, y: y, c: c, p: p })
              ]
            })
          );
        }
      }
    }
    return moving.concat(swapping);
  }

  postPlay(move) {
    super.postPlay(move);
    // Was my king swapped?
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.appear[1].c] = [move.appear[1].x, move.appear[1].y];
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
  }

  static get VALUES() {
    return Object.assign({ j: 2 }, ChessRules.VALUES);
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
