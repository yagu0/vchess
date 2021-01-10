import { ChessRules } from "@/base_rules";

export class KingsmakerRules extends ChessRules {

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // At least one king per color.
    if (Object.values(kings).some(v => v == 0)) return false;
    return true;
  }

  scanKings() {}

  getPotentialMovesFrom([x, y]) {
    const moves = super.getPotentialMovesFrom([x, y]);
    if (this.getPiece(x, y) != V.PAWN) return moves;
    const c = this.getColor(x, y);
    const oppCol = V.GetOppCol(c);
    const forward = (c == 'w' ? -1 : 1);
    const lastRanks = (c == 'w' ? [0, 1] : [7, 6]);
    let newKingMoves = [];
    if (lastRanks.includes(x + forward)) {
      // Manually add promotion into enemy king:
      const trials = [
        { step: [forward, 0] },
        { step: [forward, 1], capture: true },
        { step: [forward, -1], capture: true }
      ];
      for (let s of trials) {
        const [i, j] = [x + s.step[0], y + s.step[1]];
        if (
          V.OnBoard(i, j) &&
          (
            (!s.capture && this.board[i][j] == V.EMPTY) ||
            (
              s.capture &&
              this.board[i][j] != V.EMPTY &&
              this.getColor(i, j) == oppCol
            )
          )
        ) {
          newKingMoves.push(
            super.getBasicMove([x, y], [i, j], { c: oppCol, p: V.KING })
          );
        }
      }
    }
    return moves.concat(newKingMoves);
  }

  underCheck(color) {
    // First at first check found (if any)
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getPiece(i, j) == V.KING &&
          this.getColor(i, j) == color
        ) {
          if (super.isAttacked([i, j], oppCol)) return true;
        }
      }
    }
    return false;
  }

  getCheckSquares() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let res = [];
    // Scan all kings
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getPiece(i, j) == V.KING &&
          this.getColor(i, j) == color
        ) {
          if (super.isAttacked([i, j], oppCol)) res.push([i, j]);
        }
      }
    }
    return res;
  }

  postPlay(move) {
    this.updateCastleFlags(move, move.vanish[0].p);
  }

  postUndo() {}

  static get VALUES() {
    // Assign -5 to the king, so that the bot sometimes promote into king
    return Object.assign({}, ChessRules.VALUES, { k: -5 });
  }

};
