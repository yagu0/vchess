import { ChessRules } from "@/base_rules";

// NOTE: a lot copy-pasted from Hoppelpoppel
export class NewzealandRules extends ChessRules {

  // TODO: merge with base_rules.js
  getSlideNJumpMoves_([x, y], steps, oneStep, options) {
    options = options || {};
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (!options.onlyTake) moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]) && !options.onlyMove)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialKnightMoves(sq) {
    // The knight captures like a rook
    return (
      this.getSlideNJumpMoves_(
        sq, ChessRules.steps[V.KNIGHT], "oneStep", { onlyMove: true })
      .concat(
        this.getSlideNJumpMoves_(
          sq, ChessRules.steps[V.ROOK], null, { onlyTake: true }))
    );
  }

  getPotentialRookMoves(sq) {
    // The rook captures like a knight
    return (
      this.getSlideNJumpMoves_(
        sq, ChessRules.steps[V.ROOK], null, { onlyMove: true })
      .concat(
        this.getSlideNJumpMoves_(
          sq, ChessRules.steps[V.KNIGHT], "oneStep", { onlyTake: true }))
    );
  }

  isAttackedByKnight([x, y], color) {
    return super.isAttackedBySlideNJump(
      [x, y], color, V.KNIGHT, V.steps[V.ROOK]);
  }

  isAttackedByRook([x, y], color) {
    return super.isAttackedBySlideNJump(
      [x, y], color, V.ROOK, V.steps[V.KNIGHT], 1);
  }

};
