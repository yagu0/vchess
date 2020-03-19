import { ChessRules } from "@/base_rules";

export class ExtinctionRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: ChessRules.PawnSpecs.promotions.concat([V.KING]) }
    );
  }

  static IsGoodPosition(position) {
    if (!ChessRules.IsGoodPosition(position))
      return false;
    // Also check that each piece type is present
    const rows = position.split("/");
    let pieces = {};
    for (let row of rows) {
      for (let i = 0; i < row.length; i++) {
        if (isNaN(parseInt(row[i])) && !pieces[row[i]])
          pieces[row[i]] = true;
      }
    }
    if (Object.keys(pieces).length != 12)
      return false;
    return true;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const pos = V.ParseFen(fen).position;
    // NOTE: no need for safety "|| []", because each piece type must be present
    // (otherwise game is already over!)
    this.material = {
      w: {
        [V.KING]: pos.match(/K/g).length,
        [V.QUEEN]: pos.match(/Q/g).length,
        [V.ROOK]: pos.match(/R/g).length,
        [V.KNIGHT]: pos.match(/N/g).length,
        [V.BISHOP]: pos.match(/B/g).length,
        [V.PAWN]: pos.match(/P/g).length
      },
      b: {
        [V.KING]: pos.match(/k/g).length,
        [V.QUEEN]: pos.match(/q/g).length,
        [V.ROOK]: pos.match(/r/g).length,
        [V.KNIGHT]: pos.match(/n/g).length,
        [V.BISHOP]: pos.match(/b/g).length,
        [V.PAWN]: pos.match(/p/g).length
      }
    };
  }

  // TODO: verify this assertion
  atLeastOneMove() {
    return true; //always at least one possible move
  }

  filterValid(moves) {
    return moves; //there is no check
  }

  getCheckSquares() {
    return [];
  }

  postPlay(move) {
    super.postPlay(move);
    // Treat the promotion case: (not the capture part)
    if (move.appear[0].p != move.vanish[0].p) {
      this.material[move.appear[0].c][move.appear[0].p]++;
      this.material[move.appear[0].c][V.PAWN]--;
    }
    if (move.vanish.length == 2 && move.appear.length == 1)
      //capture
      this.material[move.vanish[1].c][move.vanish[1].p]--;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.appear[0].p != move.vanish[0].p) {
      this.material[move.appear[0].c][move.appear[0].p]--;
      this.material[move.appear[0].c][V.PAWN]++;
    }
    if (move.vanish.length == 2 && move.appear.length == 1)
      this.material[move.vanish[1].c][move.vanish[1].p]++;
  }

  getCurrentScore() {
    if (this.atLeastOneMove()) {
      // Game not over?
      const color = this.turn;
      if (
        Object.keys(this.material[color]).some(p => {
          return this.material[color][p] == 0;
        })
      ) {
        return this.turn == "w" ? "0-1" : "1-0";
      }
      return "*";
    }
    return this.turn == "w" ? "0-1" : "1-0"; //NOTE: currently unreachable...
  }

  evalPosition() {
    const color = this.turn;
    if (
      Object.keys(this.material[color]).some(p => {
        return this.material[color][p] == 0;
      })
    ) {
      // Very negative (resp. positive) if white (reps. black) pieces set is incomplete
      return (color == "w" ? -1 : 1) * V.INFINITY;
    }
    return super.evalPosition();
  }
};
