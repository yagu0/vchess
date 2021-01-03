import { ChessRules, PiPo, Move } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class PacosakoRules extends ChessRules {

  static get IMAGE_EXTENSION() {
    return ".png";
  }

  // Unions (left = white if upperCase, black otherwise)
  static get UNIONS() {
    return {
      a: ['p', 'p'],
      c: ['p', 'r'],
      d: ['p', 'n'],
      e: ['p', 'b'],
      f: ['p', 'q'],
      g: ['p', 'k'],
      h: ['r', 'r'],
      i: ['r', 'n'],
      j: ['r', 'b'],
      l: ['r', 'q'],
      m: ['r', 'k'],
      o: ['n', 'n'],
      s: ['n', 'b'],
      t: ['n', 'q'],
      u: ['n', 'k'],
      v: ['b', 'b'],
      w: ['b', 'q'],
      x: ['b', 'k'],
      y: ['q', 'q'],
      z: ['q', 'k']
    };
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kingSymb = ['k', 'g', 'm', 'u', 'x'];
    let kings = { 'k': 0, 'K': 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowR = row[i].toLowerCase
        if (!!(row[i].toLowerCase().match(/[a-z]/))) {
          sumElts++;
          if (kingSymb.includes(row[i])) kings['k']++;
          else if (kingSymb.some(s => row[i] == s.toUpperCase())) kings['K']++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board. Exactly one per color.
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  getPpath(b) {
    return "Pacosako/" + b;
  }

  getPPath(m) {
    if (ChessRules.PIECES.includes(m.appear[0].p)) return super.getPPpath(m);
    // For an union, show only relevant piece:
    // The color must be deduced from the move: reaching final rank of who?
    const color = (m.appear[0].x == 0 ? 'b' : 'w');
    const up = this.getUnionPieces(color, m.appear[0].p);
    return color + up[color];
  }

  canTake([x1, y1], [x2, y2]) {
    const c1 = this.getColor(x1, y1);
    const c2 = this.getColor(x2, y2);
    return (c1 != 'u' && c2 != c1);
  }

  canIplay(side, [x, y]) {
    return this.turn == side && this.getColor(x, y) != V.GetOppCol(side);
  }

  scanKings(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    const kingSymb = ['k', 'g', 'm', 'u', 'x'];
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        const c = fenRows[i].charAt(j);
        if (kingSymb.includes(c))
          this.kingPos["b"] = [i, k];
        else if (kingSymb.some(s => c == s.toUpperCase()))
          this.kingPos["w"] = [i, k];
        else {
          const num = parseInt(fenRows[i].charAt(j), 10);
          if (!isNaN(num)) k += num - 1;
        }
        k++;
      }
    }
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Stack of "last move" only for intermediate chaining
    this.lastMoveEnd = [null];
  }

  getColor(i, j) {
    const p = this.board[i][j].charAt(1);
    if (ChessRules.PIECES.includes(p)) return super.getColor(i, j);
    return 'u'; //union
  }

  getPiece(i, j, color) {
    const p = this.board[i][j].charAt(1);

console.log(p);

    if (ChessRules.PIECES.includes(p)) return p;
    const c = this.board[i][j].charAt(0);
    // NOTE: this.turn == HACK, but should work...
    color = color || this.turn;
    return V.UNIONS[p][c == color ? 0 : 1];
  }

  getUnionPieces(color, code) {
    const pieces = V.UNIONS[code];
    return {
      w: pieces[color == 'w' ? 0 : 1],
      b: pieces[color == 'b' ? 0 : 1]
    };
  }

  getUnionCode(p1, p2) {
    let uIdx = (
      Object.values(V.UNIONS).findIndex(v => v[0] == p1 && v[1] == p2)
    );
    const c = (uIdx >= 0 ? 'w' : 'b');
    if (uIdx == -1) {
      uIdx = (
        Object.values(V.UNIONS).findIndex(v => v[0] == p2 && v[1] == p1)
      );
    }
    return { c: c, p: Object.keys(V.UNIONS)[uIdx] };
  }

  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.board[sx][sy].charAt(0);
    const initPiece = this.board[sx][sy].charAt(1);
    // 4 cases : moving
    //  - union to free square (other cases are illegal: return null)
    //  - normal piece to free square,
    //                 to enemy normal piece, or
    //                 to union (releasing our piece)
    let mv = new Move({
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: initColor,
          p: initPiece
        })
      ],
      end: { x: ex, y: ey }
    });
    // Treat free square cases first:
    if (this.board[ex][ey] == V.EMPTY) {
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: initColor,
          p: !!tr ? tr.p : initPiece
        })
      ];
      return mv;
    }
    // Now the two cases with union / release:
    const destColor = this.board[ex][ey].charAt(0);
    const destPiece = this.board[ex][ey].charAt(1);
    mv.vanish.push(
      new PiPo({
        x: ex,
        y: ey,
        c: destColor,
        p: destPiece
      })
    );
    if (ChessRules.PIECES.includes(destPiece)) {
      // Normal piece: just create union
      const cp = this.getUnionCode(!!tr ? tr.p : initPiece, destPiece);
      mv.appear = [
        new PiPo({
          x: ex,
          y: ey,
          c: cp.c,
          p: cp.p
        })
      ];
      return mv;
    }
    // Releasing a piece in an union: keep track of released piece
    const up = this.getUnionPieces(destColor, destPiece);
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    const cp = this.getUnionCode(!!tr ? tr.p : initPiece, up[oppCol])
    mv.appear = [
      new PiPo({
        x: ex,
        y: ey,
        c: cp.c,
        p: cp.p
      })
    ];
    mv.released = up[c];
    return mv;
  }

  getPotentialMoves([x, y]) {
    const L = this.lastMoveEnd.length;
    const lm = this.lastMoveEnd[L-1];
    let piece = null;
    if (!!lm) {
      if (x != lm.x || y != lm.y) return [];
      piece = lm.p;
    }
    if (!!piece) {
      var unionOnBoard = this.board[x][y];
      this.board[x][y] = this.turn + piece;
    }
    let baseMoves = [];
    switch (piece || this.getPiece(x, y)) {
      case V.PAWN:
        baseMoves = this.getPotentialPawnMoves([x, y]);
        break;
      case V.ROOK:
        baseMoves = this.getPotentialRookMoves([x, y]);
        break;
      case V.KNIGHT:
        baseMoves = this.getPotentialKnightMoves([x, y]);
        break;
      case V.BISHOP:
        baseMoves = this.getPotentialBishopMoves([x, y]);
        break;
      case V.QUEEN:
        baseMoves = this.getPotentialQueenMoves([x, y]);
        break;
      case V.KING:
        baseMoves = this.getPotentialKingMoves([x, y]);
        break;
    }
    // When a pawn in an union reaches final rank with a non-standard
    // promotion move: apply promotion anyway
    let moves = [];
    baseMoves.forEach(m => {
      // (move to first rank, which is last rank for opponent [pawn]), should show promotion choices.
      //if (m. //bring enemy pawn to his first rank ==> union types involved... color...
      moves.push(m); //TODO
    });
    if (!!piece) this.board[x][y] = unionOnBoard;
    return moves;
  }

  play(move) {
    this.epSquares.push(this.getEpSquare(move));
    // Check if the move is the last of the turn: all cases except releases
    move.last = (
      move.vanish.length == 1 ||
      ChessRules.PIECES.includes(move.vanish[1].p)
    );
    if (move.last) {
      // No more union releases available
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.lastMoveEnd.push(null);
    }
    else {
      const color = this.board[move.end.x][move.end.y].charAt(0);
      const oldUnion = this.board[move.end.x][move.end.y].charAt(1);
      const released = this.getUnionPieces(color, oldUnion)[this.turn];
      this.lastMoveEnd.push(Object.assign({}, move.end, { p: released }));
    }
    V.PlayOnBoard(this.board, move);
  }

  undo(move) {
    this.epSquares.pop();
    V.UndoOnBoard(this.board, move);
    this.lastMoveEnd.pop();
    if (move.last) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
  }

  getCurrentScore() {
    // Check kings: if one is dancing, the side lost
    const [kpW, kpB] = [this.kingPos['w'], this.kingPos['b']];
    if (this.board[kpB[0]][kpB[1]].charAt(1) != 'k') return "1-0";
    if (this.board[kpW[0]][kpW[1]].charAt(1) != 'k') return "0-1";
    return "*";
  }

  getComputerMove() {
    let moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    // Just play random moves (for now at least. TODO?)
    let mvArray = [];
    while (moves.length > 0) {
      const mv = moves[randInt(moves.length)];
      mvArray.push(mv);
      this.play(mv);
      if (!mv.last)
        // A piece was just released from an union
        moves = this.getPotentialMovesFrom([mv.end.x, mv.end.y]);
      else break;
    }
    for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
    return (mvArray.length > 1 ? mvArray : mvArray[0]);
  }

  // NOTE: evalPosition() is wrong, but unused since bot plays at random

  getNotation(move) {
    // TODO: in case of enemy pawn promoted, add "=..." in the end
    return super.getNotation(move);
  }

};
