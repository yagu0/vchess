import { ChessRules } from "@/base_rules";

export class Pacifist1Rules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { canCapture: false }
    );
  }

  static get HasEnpassant() {
    return false;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kingsCount = 0;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kingsCount++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board. May be of the same color.
    if (kingsCount != 2) return false;
    return true;
  }

  scanKings(fen) {
    // Kings may be swapped, so they are not tracked (no kingPos)
    this.INIT_COL_KING = { w: -1, b: -1 };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
            this.INIT_COL_KING["b"] = k;
            break;
          case "K":
            this.INIT_COL_KING["w"] = k;
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  // Sum white pieces attacking a square, and remove black pieces count.
  sumAttacks([x, y]) {
    const getSign = (color) => {
      return (color == 'w' ? 1 : -1);
    };
    let res = 0;
    // Knights:
    V.steps[V.KNIGHT].forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j) && this.getPiece(i, j) == V.KNIGHT)
        res += getSign(this.getColor(i, j));
    });
    // Kings:
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j) && this.getPiece(i, j) == V.KING)
        res += getSign(this.getColor(i, j));
    });
    // Pawns:
    for (let c of ['w', 'b']) {
      for (let shift of [-1, 1]) {
        const sign = getSign(c);
        const [i, j] = [x + sign, y + shift];
        if (
          V.OnBoard(i, j) &&
          this.getPiece(i, j) == V.PAWN &&
          this.getColor(i, j) == c
        ) {
          res += sign;
        }
      }
    }
    // Other pieces (sliders):
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
      let [i, j] = [x + s[0], y + s[1]];
      let compatible = [V.QUEEN];
      compatible.push(s[0] == 0 || s[1] == 0 ? V.ROOK : V.BISHOP);
      let firstCol = undefined;
      while (V.OnBoard(i, j)) {
        if (this.board[i][j] != V.EMPTY) {
          if (!(compatible.includes(this.getPiece(i, j)))) break;
          const colIJ = this.getColor(i, j);
          if (!firstCol) firstCol = colIJ;
          if (colIJ == firstCol) res += getSign(colIJ);
          else break;
        }
        i += s[0];
        j += s[1];
      }
    });
    return res;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    if (this.getPiece(x, y) == V.PAWN) {
      // Pawns cannot move 2 squares if the intermediate is overly persuaded
      moves = moves.filter(m => {
        if (Math.abs(m.end.x - m.start.x) == 2) {
          const [i, j] = [(m.start.x + m.end.x) / 2, y];
          const persuasion = this.sumAttacks([i, j]);
          return (
            color == 'w' && persuasion >= 0 ||
            color == 'b' && persuasion <= 0
          );
        }
        return true;
      });
    }
    // Potentially flipped (opp) pieces
    let targets = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == oppCol)
          targets.push([i, j]);
      }
    }
    moves.forEach(m => {
      // Start persuading other pieces: loop until nothing changes
      V.PlayOnBoard(this.board, m);
      while (true) {
        let persuaded = [];
        targets.forEach(t => {
          if (this.getColor(t[0], t[1]) == oppCol) {
            const sqAttacks = this.sumAttacks([t[0], t[1]]);
            if (
              (oppCol == 'w' && sqAttacks < 0) ||
              (oppCol == 'b' && sqAttacks > 0)
            ) {
              persuaded.push(t);
            }
          }
        });
        if (persuaded.length == 0) break;
        persuaded.forEach(p => {
          this.board[p[0]][p[1]] = color + this.getPiece(p[0], p[1]);
        });
      }
      V.UndoOnBoard(this.board, m);
      // Reset pieces colors + adjust move (flipped pieces)
      targets.forEach(t => {
        if (this.getColor(t[0], t[1]) == color) {
          const piece = this.getPiece(t[0], t[1]);
          m.appear.push({ x: t[0], y: t[1], c: color, p: piece });
          m.vanish.push({ x: t[0], y: t[1], c: oppCol, p: piece });
          this.board[t[0]][t[1]] = oppCol + piece;
        }
      });
    });
    return moves;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let loop = 0; loop < steps.length; loop++) {
      const step = steps[loop];
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      // No captures
    }
    return moves;
  }

  underCheck(color) {
    // Find the king(s) and determine if it (both) is persuaded.
    // If yes, "under check"
    let kingPos = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.getPiece(i, j) == V.KING && this.getColor(i, j) == color)
          kingPos.push([i, j]);
      }
    }
    return kingPos.every(kp => {
      const persuasion = this.sumAttacks(kp);
      return (
        (color == 'w' && persuasion < 0) ||
        (color == 'b' && persuasion > 0)
      );
    });
  }

  filterValid(moves) {
    const fmoves = super.filterValid(moves);
    const color = this.turn;
    // If the king isn't here, only moves persuading a king are valid
    const kingHere = this.board.some(b =>
      b.some(cell => cell[0] == color && cell[1] == V.KING)
    );
    if (!kingHere) {
      return (
        fmoves.filter(m => m.appear.some(a => a.c == color && a.p == V.KING))
      );
    }
    return fmoves;
  }

  getCheckSquares() {
    // There are not really "checks": just color change
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    // TODO: if no king of turn color, and no move to get one, then it's lost
    // otherwise 1/2 if no moves, or "*"
    const kingHere = this.board.some(b =>
      b.some(cell => cell[0] == color && cell[1] == V.KING)
    );
    if (kingHere) {
      if (this.atLeastOneMove()) return "*";
      return "1/2";
    }
    // No king was found: try to convert one
    const moves = this.getAllValidMoves();
    return (
      moves.some(m => m.appear.some(a => a.c == color && a.p == V.KING))
        ? "*"
        : (color == 'w' ? "0-1" : "1-0")
    );
  }

  postPlay(move) {
    this.updateCastleFlags(move, move.vanish[0].p);
  }

  postUndo() {}

  static get SEARCH_DEPTH() {
    return 1;
  }
};
