import { ChessRules, Move, PiPo } from "@/base_rules";

export class CannibalRules extends ChessRules {
  static get KING_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'q': 't'
    };
  }

  static get KING_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      't': 'q'
    };
  }

  // Kings may be disguised:
  getPiece(x, y) {
    const piece = this.board[x][y].charAt(1);
    if (Object.keys(V.KING_DECODE).includes(piece))
      return V.KING_DECODE[piece];
    return piece;
  }

  getPpath(b) {
    return (Object.keys(V.KING_DECODE).includes(b[1]) ? "Cannibal/" : "") + b;
  }

  // Kings may be disguised:
  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const rows = V.ParseFen(fen).position.split("/");
    if (this.kingPos["w"][0] < 0 || this.kingPos["b"][0] < 0) {
      for (let i = 0; i < rows.length; i++) {
        let k = 0; //column index on board
        for (let j = 0; j < rows[i].length; j++) {
          const piece = rows[i].charAt(j);
          if (Object.keys(V.KING_DECODE).includes(piece.toLowerCase())) {
            const color = (piece.charCodeAt(0) <= 90 ? 'w' : 'b');
            this.kingPos[color] = [i, k];
          } else {
            const num = parseInt(rows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
          k++;
        }
      }
    }
  }

  // Trim all non-capturing moves
  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length == 2 && m.appear.length == 1);
  }

	// Stop at the first capture found (if any)
  atLeastOneCapture() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) != oppCol &&
          this.filterValid(this.getPotentialMovesFrom([i, j])).some(m =>
            // Warning: discard castle moves
            m.vanish.length == 2 && m.appear.length == 1)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // Because of the disguised kings, getPiece() could be wrong:
  // use board[x][y][1] instead (always valid).
  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.getColor(sx, sy);
    const initPiece = this.board[sx][sy].charAt(1);
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : initColor,
          p: tr ? tr.p : initPiece
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: initColor,
          p: initPiece
        })
      ]
    });

    // The opponent piece disappears if we take it
    if (this.board[ex][ey] != V.EMPTY) {
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.board[ex][ey].charAt(1)
        })
      );

      // If the captured piece has a different nature: take it as well
      if (mv.vanish[0].p != mv.vanish[1].p) {
        if (
          mv.vanish[0].p == V.KING ||
          Object.keys(V.KING_DECODE).includes(mv.vanish[0].p)
        ) {
          mv.appear[0].p = V.KING_CODE[mv.vanish[1].p];
        } else mv.appear[0].p = mv.vanish[1].p;
      }
    }
    else if (!!tr && mv.vanish[0].p != V.PAWN)
      // Special case of a non-capturing king-as-pawn promotion
      mv.appear[0].p = V.KING_CODE[tr.p];

    return mv;
  }

  getPotentialMovesFrom([x, y]) {
    const piece = this.board[x][y].charAt(1);
    if (Object.keys(V.KING_DECODE).includes(piece))
      return super.getPotentialMovesFrom([x, y], V.KING_DECODE[piece]);
    return super.getPotentialMovesFrom([x, y], piece);
  }

  addPawnMoves([x1, y1], [x2, y2], moves) {
    let finalPieces = [V.PAWN];
    const color = this.turn;
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    if (x2 == lastRank) {
      if (this.board[x2][y2] != V.EMPTY)
        // Cannibal rules: no choice if capture
        finalPieces = [this.getPiece(x2, y2)];
      else finalPieces = V.PawnSpecs.promotions;
    }
    let tr = null;
    for (let piece of finalPieces) {
      tr = (piece != V.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  getPossibleMovesFrom(sq) {
    let moves = this.filterValid(this.getPotentialMovesFrom(sq));
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  getAllValidMoves() {
    const moves = super.getAllValidMoves();
    if (moves.some(m => m.vanish.length == 2 && m.appear.length == 1))
      return V.KeepCaptures(moves);
    return moves;
  }

  postPlay(move) {
    const c = V.GetOppCol(this.turn);
    const piece = move.appear[0].p;
    // Update king position + flags
    if (piece == V.KING || Object.keys(V.KING_DECODE).includes(piece)) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [V.size.y, V.size.y];
      return;
    }
    super.updateCastleFlags(move);
  }

  postUndo(move) {
    // (Potentially) Reset king position
    const c = this.getColor(move.start.x, move.start.y);
    const piece = move.appear[0].p;
    if (piece == V.KING || Object.keys(V.KING_DECODE).includes(piece))
      this.kingPos[c] = [move.start.x, move.start.y];
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 9,
      k: 5
    };
  }

  static get SEARCH_DEPTH() {
    return 4;
  }
};
