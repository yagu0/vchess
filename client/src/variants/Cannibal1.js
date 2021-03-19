import { ChessRules } from "@/base_rules";

export class Cannibal1Rules extends ChessRules {

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

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "w": 0, "b": 0 };
    const allPiecesCodes = V.PIECES.concat(Object.keys(V.KING_DECODE));
    const kingBlackCodes = Object.keys(V.KING_DECODE).concat(['k']);
    const kingWhiteCodes =
      Object.keys(V.KING_DECODE).map(k => k.toUpperCase()).concat(['K']);
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (kingBlackCodes.includes(row[i])) kings['b']++;
        else if (kingWhiteCodes.includes(row[i])) kings['w']++;
        if (allPiecesCodes.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board, only one of each color:
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
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
            const num = parseInt(rows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
          k++;
        }
      }
    }
  }

  // Because of the disguised kings, getPiece() could be wrong:
  // use board[x][y][1] instead (always valid).
  getBasicMove([sx, sy], [ex, ey], tr) {
    let mv = super.getBasicMove([sx, sy], [ex, ey], tr);

    if (this.board[ex][ey] != V.EMPTY) {
      // If the captured piece has a different nature: take it as well
      if (mv.vanish[0].p != mv.vanish[1].p) {
        if (
          mv.vanish[0].p == V.KING ||
          Object.keys(V.KING_DECODE).includes(mv.vanish[0].p)
        ) {
          mv.appear[0].p = V.KING_CODE[mv.vanish[1].p];
        }
        else mv.appear[0].p = mv.vanish[1].p;
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

  postPlay(move) {
    const c = V.GetOppCol(this.turn);
    const piece = move.appear[0].p;
    // Update king position + flags
    if (piece == V.KING || Object.keys(V.KING_DECODE).includes(piece)) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [V.size.y, V.size.y];
    }
    // Next call is still required because the king may eat an opponent's rook
    // TODO: castleFlags will be turned off twice then.
    super.updateCastleFlags(move, piece);
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

  getNotation(move) {
    let notation = super.getNotation(move);
    const lastRank = (move.appear[0].c == "w" ? 0 : 7);
    if (
      move.end.x != lastRank &&
      this.getPiece(move.start.x, move.start.y) == V.PAWN &&
      move.vanish.length == 2 &&
      move.appear[0].p != V.PAWN
    ) {
      // Fix "promotion" (transform indicator) from base_rules notation
      notation = notation.slice(0, -2);
    }
    return notation;
  }

};
