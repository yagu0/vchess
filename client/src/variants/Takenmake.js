import { ChessRules } from "@/base_rules";

export class TakenmakeRules extends ChessRules {
  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Stack of "last move" only for intermediate captures
    this.lastMoveEnd = [null];
  }

  getPotentialMovesFrom([x, y], asA) {
    const L = this.lastMoveEnd.length;
    if (!asA && !!this.lastMoveEnd[L-1]) {
      asA = this.lastMoveEnd[L-1].p;
      if (x != this.lastMoveEnd[L-1].x || y != this.lastMoveEnd[L-1].y) {
        // A capture was played: wrong square
        return [];
      }
    }
    let moves = [];
    const piece = this.getPiece(x, y);
    switch (asA || piece) {
      case V.PAWN:
        if (!asA || piece == V.PAWN)
          moves = this.getPotentialPawnMoves([x, y]);
        else {
          // Special case: we don't want promotion, since just moving like
          // a pawn, but I'm in fact not a pawn :)
          const shiftX = (this.turn == 'w' ? -1 : 1);
          if (this.board[x + shiftX][y] == V.EMPTY)
            moves = [this.getBasicMove([x, y], [x + shiftX, y])];
        }
        break;
      case V.ROOK:
        moves = this.getPotentialRookMoves([x, y]);
        break;
      case V.KNIGHT:
        moves = this.getPotentialKnightMoves([x, y]);
        break;
      case V.BISHOP:
        moves = this.getPotentialBishopMoves([x, y]);
        break;
      case V.KING:
        moves = this.getPotentialKingMoves([x, y]);
        break;
      case V.QUEEN:
        moves = this.getPotentialQueenMoves([x, y]);
        break;
    }
    // Post-process: if capture,
    // can a move "as-capturer" be achieved with the same piece?
    if (!asA) {
      const color = this.turn;
      return moves.filter(m => {
        if (m.vanish.length == 2 && m.appear.length == 1) {
          this.play(m);
          let moveOk = true;
          const makeMoves =
            this.getPotentialMovesFrom([m.end.x, m.end.y], m.vanish[1].p);
          if (
            makeMoves.every(mm => {
              // Cannot castle after a capturing move
              // (with the capturing piece):
              if (mm.vanish.length == 2) return true;
              this.play(mm);
              const res = this.underCheck(color);
              this.undo(mm);
              return res;
            })
          ) {
            moveOk = false;
          }
          this.undo(m);
          return moveOk;
        }
        return true;
      });
    }
    // Moving "as a": filter out captures (no castles here)
    return moves.filter(m => m.vanish.length == 1);
  }

  getPossibleMovesFrom(sq) {
    const L = this.lastMoveEnd.length;
    let asA = undefined;
    if (!!this.lastMoveEnd[L-1]) {
      if (
        sq[0] != this.lastMoveEnd[L-1].x ||
        sq[1] != this.lastMoveEnd[L-1].y
      ) {
        return [];
      }
      asA = this.lastMoveEnd[L-1].p;
    }
    return this.filterValid(this.getPotentialMovesFrom(sq, asA));
  }

  filterValid(moves) {
    let noCaptureMoves = [];
    let captureMoves = [];
    moves.forEach(m => {
      if (m.vanish.length == 1 || m.appear.length == 2) noCaptureMoves.push(m);
      else captureMoves.push(m);
    });
    // Capturing moves were already checked in getPotentialMovesFrom()
    return super.filterValid(noCaptureMoves).concat(captureMoves);
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    if (move.vanish.length == 1 || move.appear.length == 2) {
      // Not a capture: change turn
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.lastMoveEnd.push(null);
    }
    else {
      this.lastMoveEnd.push(
        Object.assign({}, move.end, { p: move.vanish[1].p })
      );
    }
    this.postPlay(move);
  }

  postPlay(move) {
    const c = move.vanish[0].c;
    const piece = move.vanish[0].p;
    if (piece == V.KING && move.appear.length > 0) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
    }
    super.updateCastleFlags(move, piece);
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    this.epSquares.pop();
    this.lastMoveEnd.pop();
    V.UndoOnBoard(this.board, move);
    if (move.vanish.length == 1 || move.appear.length == 2) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    super.postUndo(move);
  }
};
