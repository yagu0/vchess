import { ChessRules } from "@/base_rules";

export class CopycatRules extends ChessRules {

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // Expand potential moves if attacking friendly pieces.
    const piece = this.getPiece(x,y);
    if ([V.PAWN, V.KING].includes(piece)) return moves;
    const color = this.turn;
    const oneStep = (piece == V.PAWN);
    let movements = {},
        steps = [];
    if (piece == V.QUEEN) steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    else steps = V.steps[piece];
    steps.forEach(s => {
      let [i, j] = [x + s[0], y + s[1]];
      while (
        V.OnBoard(i, j) &&
        this.board[i][j] == V.EMPTY &&
        piece != V.KNIGHT
      ) {
        i += s[0];
        j += s[1];
      }
      if (V.OnBoard(i, j) && this.getColor(i, j) == color) {
        const attacked = this.getPiece(i, j);
        if ([V.ROOK, V.BISHOP, V.KNIGHT].includes(attacked)) {
          if (!movements[attacked]) movements[attacked] = true;
        }
        else if (attacked == V.QUEEN) {
          if (!movements[V.ROOK]) movements[V.ROOK] = true;
          if (!movements[V.BISHOP]) movements[V.BISHOP] = true;
        }
      }
    });
    Object.keys(movements).forEach(type => {
      if (
        (piece != V.QUEEN && type != piece) ||
        (piece == V.QUEEN && type == V.KNIGHT)
      ) {
        Array.prototype.push.apply(moves,
          this.getSlideNJumpMoves([x, y], V.steps[type], type == V.KNIGHT));
      }
    });
    return moves;
  }

  // Detect indirect attacks:
  isAttackedBy_aux(
    [x, y], color, steps1, oneStep1, piece1, steps2, oneStep2, pieces2)
  {
    for (let s1 of steps1) {
      let i = x + s1[0],
          j = y + s1[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY && !oneStep1) {
        i += s1[0];
        j += s1[1];
      }
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getPiece(i, j) == piece1 &&
        this.getColor(i, j) == color
      ) {
        // Continue to detect "copycat" attacks
        for (let s2 of steps2) {
          let ii = i + s2[0],
              jj = j + s2[1];
          while (
            V.OnBoard(ii, jj) &&
            this.board[ii][jj] == V.EMPTY &&
            !oneStep2
          ) {
            ii += s2[0];
            jj += s2[1];
          }
          if (
            V.OnBoard(ii, jj) &&
            this.board[ii][jj] != V.EMPTY &&
            pieces2.includes(this.getPiece(ii, jj)) &&
            this.getColor(ii, jj) == color
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isAttackedByKnight(sq, color) {
    if (super.isAttackedByKnight(sq, color)) return true;
    return (
      this.isAttackedBy_aux(sq, color,
        V.steps[V.ROOK], false, V.KNIGHT,
        V.steps[V.KNIGHT], true, [V.ROOK, V.QUEEN]
      ) ||
      this.isAttackedBy_aux(sq, color,
        V.steps[V.BISHOP], false, V.KNIGHT,
        V.steps[V.KNIGHT], true, [V.BISHOP, V.QUEEN]
      )
    );
  }

  isAttackedByRook(sq, color) {
    if (super.isAttackedByRook(sq, color)) return true;
    return (
      this.isAttackedBy_aux(sq, color,
        V.steps[V.KNIGHT], true, V.ROOK,
        V.steps[V.ROOK], false, [V.KNIGHT]
      ) ||
      this.isAttackedBy_aux(sq, color,
        V.steps[V.BISHOP], false, V.ROOK,
        V.steps[V.ROOK], false, [V.BISHOP, V.QUEEN]
      )
    );
  }

  isAttackedByBishop(sq, color) {
    if (super.isAttackedByBishop(sq, color)) return true;
    return (
      this.isAttackedBy_aux(sq, color,
        V.steps[V.KNIGHT], true, V.BISHOP,
        V.steps[V.BISHOP], false, [V.KNIGHT]
      ) ||
      this.isAttackedBy_aux(sq, color,
        V.steps[V.ROOK], false, V.BISHOP,
        V.steps[V.BISHOP], false, [V.ROOK, V.QUEEN]
      )
    );
  }

  isAttackedByQueen(sq, color) {
    if (super.isAttackedByQueen(sq, color)) return true;
    return (
      this.isAttackedBy_aux(sq, color,
        V.steps[V.KNIGHT], true, V.QUEEN,
        V.steps[V.ROOK].concat(V.steps[V.BISHOP]), false, [V.KNIGHT]
      )
    );
  }

};
