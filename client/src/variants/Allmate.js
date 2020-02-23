import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class AllmateRules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  canTake(sq1, sq2) {
    return false; //Captures handled differently
  }

  getCheckSquares() {
    // No notion of check
    return [];
  }

  static GenRandInitFen() {
    return ChessRules.GenRandInitFen().replace(/ -$/, "");
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);

    // Augment moves with "mate-captures":
    // TODO: this is coded in a highly inefficient way...
    const color = this.turn;
    const oppCol = V.GetOppCol(this.turn);
    moves.forEach(m => {
      this.play(m);

      // 1) What is attacked?
      let attacked = {};
      for (let i=0; i<V.size.x; i++) {
        for (let j=0; j<V.size.y; j++) {
          if (this.getColor(i,j) == oppCol && this.isAttacked([i,j], [color]))
            attacked[i+"_"+j] = [i,j];
        }
      }

      // 2) Among attacked pieces, which cannot escape capture?
      // Avoid "oppMoves = this.getAllValidMoves();" => infinite recursion
      outerLoop: for (let i=0; i<V.size.x; i++) {
        for (let j=0; j<V.size.y; j++) {
          if (this.getColor(i,j) == oppCol) {
            let oppMoves = [];
            switch (this.getPiece(i, j)) {
              case V.PAWN:
                oppMoves = this.getPotentialPawnMoves([i, j]);
                break;
              case V.ROOK:
                oppMoves = this.getPotentialRookMoves([i, j]);
                break;
              case V.KNIGHT:
                oppMoves = this.getPotentialKnightMoves([i, j]);
                break;
              case V.BISHOP:
                oppMoves = this.getPotentialBishopMoves([i, j]);
                break;
              case V.QUEEN:
                oppMoves = this.getPotentialQueenMoves([i, j]);
                break;
              case V.KING:
                oppMoves = this.getPotentialKingMoves([i, j]);
                break;
            }
            for (let om of oppMoves) {
              V.PlayOnBoard(this.board, om);
              Object.values(attacked).forEach(sq => {
                const origSq = [sq[0], sq[1]];
                if (om.start.x == sq[0] && om.start.y == sq[1])
                  // Piece moved:
                  sq = [om.appear[0].x, om.appear[0].y];
                if (!this.isAttacked(sq, [color]))
                  delete attacked[origSq[0]+"_"+origSq[1]];
              });
              V.UndoOnBoard(this.board, om);
              if (Object.keys(attacked).length == 0)
                // No need to explore more moves
                break outerLoop;
            }
          }
        }
      }

      // 3) Add mate-captures:
      Object.values(attacked).forEach(sq => {
        m.vanish.push(new PiPo({
          x: sq[0],
          y: sq[1],
          c: oppCol,
          p: this.getPiece(sq[0], sq[1])
        }));
      });

      this.undo(m);
    });

    return moves;
  }

  // No "under check" conditions in castling
  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    if (x != (c == "w" ? V.size.x - 1 : 0) || y != this.INIT_COL_KING[c])
      return []; //x isn't first rank, or king has moved (shortcut)

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook:
    const finalSquares = [
      [2, 3],
      [V.size.y - 2, V.size.y - 3]
    ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (!this.castleFlags[c][castleSide]) continue;
      // If this code is reached, rooks and king are on initial position

      // Nothing on the path of the king ? (and no checks)
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      for (let i = y; i != finalSquares[castleSide][0]; i += step) {
        if (
          this.board[x][i] != V.EMPTY &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c ||
              ![V.KING, V.ROOK].includes(this.getPiece(x, i)))
        ) {
          continue castlingCheck;
        }
      }

      // Nothing on the path to the rook?
      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != this.INIT_COL_ROOK[c][castleSide]; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }
      const rookPos = this.INIT_COL_ROOK[c][castleSide];

      // Nothing on final squares, except maybe king and castling rook?
      for (i = 0; i < 2; i++) {
        if (
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          this.getPiece(x, finalSquares[castleSide][i]) != V.KING &&
          finalSquares[castleSide][i] != rookPos
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is valid
      moves.push(
        new Move({
          appear: [
            new PiPo({ x: x, y: finalSquares[castleSide][0], p: V.KING, c: c }),
            new PiPo({ x: x, y: finalSquares[castleSide][1], p: V.ROOK, c: c })
          ],
          vanish: [
            new PiPo({ x: x, y: y, p: V.KING, c: c }),
            new PiPo({ x: x, y: rookPos, p: V.ROOK, c: c })
          ],
          end:
            Math.abs(y - rookPos) <= 2
              ? { x: x, y: rookPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  updateVariables(move) {
    super.updateVariables(move);
    if (move.vanish.length == 2 && move.appear.length == 1) {
      // Did opponent king disappeared?
      if (move.vanish[1].p == V.KING)
        this.kingPos[this.turn] = [-1, -1];
    }
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    if (move.vanish.length == 2 && move.appear.length == 1) {
      // Did opponent king disappeared?
      if (move.vanish[1].p == V.KING)
        this.kingPos[move.vanish[1].c] = [move.vanish[1].x,move.vanish[1].y];
    }
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    if (this.atLeastOneMove())
      return "*";
    // Kings still there, no moves:
    return "1/2";
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    // Add a capture mark (not describing what is captured...):
    if (move.vanish.length > 1 && move.appear[0].p != V.KING)
      notation = notation.replace("x","") + "X";
    return notation;
  }
};
