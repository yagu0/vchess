import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class MonsterRules extends ChessRules {
  static IsGoodFlags(flags) {
    // Only black can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  static GenRandInitFen(randomness) {
    if (randomness == 2) randomness--;
    const fen = ChessRules.GenRandInitFen(randomness);
    return (
      // 26 first chars are 6 rows + 6 slashes
      fen.substr(0, 26)
      // En passant available, and "half-castle"
      .concat("1PPPPPP1/4K3 w 0 ")
      .concat(fen.substr(-6, 2))
      .concat(" -")
    );
  }

  getFlagsFen() {
    return this.castleFlags['b'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'b': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['b'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'b') return super.getPotentialKingMoves([x, y]);
    // White doesn't castle:
    return this.getSlideNJumpMoves(
      [x, y],
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttacked(sq, color, castling) {
    const singleMoveAttack = super.isAttacked(sq, color);
    if (singleMoveAttack) return true;
    if (color == 'b' || !!castling) return singleMoveAttack;
    // Attacks by white: double-move allowed
    const curTurn = this.turn;
    this.turn = 'w';
    const w1Moves = super.getAllPotentialMoves();
    this.turn = curTurn;
    for (let move of w1Moves) {
      this.play(move);
      const res = super.isAttacked(sq, 'w');
      this.undo(move);
      if (res) return res;
    }
    return false;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    if (this.turn == 'b' || this.subTurn == 2)
      this.epSquares.push(this.getEpSquare(move));
    else this.epSquares.push(null);
    V.PlayOnBoard(this.board, move);
    if (this.turn == 'w') {
      if (this.subTurn == 1) this.movesCount++;
      else this.turn = 'b';
      this.subTurn = 3 - this.subTurn;
    } else {
      this.turn = 'w';
      this.movesCount++;
    }
    this.postPlay(move);
  }

  updateCastleFlags(move, piece) {
    // Only black can castle:
    const firstRank = 0;
    if (piece == V.KING && move.appear[0].c == 'b')
      this.castleFlags['b'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['b'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['b'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
  }

  postPlay(move) {
    // Definition of 'c' in base class doesn't work:
    const c = move.vanish[0].c;
    const piece = move.vanish[0].p;
    if (piece == V.KING) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
    }
    this.updateCastleFlags(move, piece);
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.turn == 'w') {
      if (this.subTurn == 2) this.subTurn = 1;
      else this.turn = 'b';
      this.movesCount--;
    } else {
      this.turn = 'w';
      this.subTurn = 2;
    }
    this.postUndo(move);
  }

  filterValid(moves) {
    if (this.turn == 'w' && this.subTurn == 1) {
      return moves.filter(m1 => {
        this.play(m1);
        // NOTE: no recursion because next call will see subTurn == 2
        const res = super.atLeastOneMove();
        this.undo(m1);
        return res;
      });
    }
    return super.filterValid(moves);
  }

  static get SEARCH_DEPTH() {
    return 1;
  }

  getComputerMove() {
    const color = this.turn;
    if (color == 'w') {
      // Generate all sequences of 2-moves
      const moves1 = this.getAllValidMoves();
      moves1.forEach(m1 => {
        m1.eval = -V.INFINITY;
        m1.move2 = null;
        this.play(m1);
        const moves2 = this.getAllValidMoves();
        moves2.forEach(m2 => {
          this.play(m2);
          const eval2 = this.evalPosition();
          this.undo(m2);
          if (eval2 > m1.eval) {
            m1.eval = eval2;
            m1.move2 = m2;
          }
        });
        this.undo(m1);
      });
      moves1.sort((a, b) => b.eval - a.eval);
      let candidates = [0];
      for (
        let i = 1;
        i < moves1.length && moves1[i].eval == moves1[0].eval;
        i++
      ) {
        candidates.push(i);
      }
      const idx = candidates[randInt(candidates.length)];
      const move2 = moves1[idx].move2;
      delete moves1[idx]["move2"];
      return [moves1[idx], move2];
    }
    // For black at depth 1, super method is fine:
    return super.getComputerMove();
  }
};
