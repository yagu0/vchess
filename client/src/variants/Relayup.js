import { ChessRules } from "@/base_rules";

// Pawns relayed by one square at a time (but with relaying piece movements)
// diff from https://www.chessvariants.com/rules/relay-chess ==> new name
export class RelayupRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { twoSquares: false }
    );
  }

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // Expand potential moves if guarded by friendly pieces.
    // NOTE: pawns cannot be promoted through a relaying move
    const piece = this.getPiece(x,y);
    const color = this.turn;
    const lastRank = (color == 'w' ? 0 : 7);
    const sq = [x, y];
    const oneStep = (piece == V.PAWN);
    let guardedBy = {};
    if (piece != V.ROOK && super.isAttackedByRook(sq, color))
      guardedBy[V.ROOK] = true;
    if (piece != V.KNIGHT && super.isAttackedByKnight(sq, color))
      guardedBy[V.KNIGHT] = true;
    if (piece != V.BISHOP && super.isAttackedByBishop(sq, color))
      guardedBy[V.BISHOP] = true;
    if (piece != V.QUEEN && super.isAttackedByQueen(sq, color))
      guardedBy[V.QUEEN] = true;
    if (piece != V.KING && super.isAttackedByKing(sq, color))
      guardedBy[V.KING] = true;
    Object.keys(guardedBy).forEach(pg => {
      let steps = null;
      if ([V.ROOK, V.KNIGHT, V.BISHOP].includes(pg)) steps = V.steps[pg];
      else steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
      const extraMoves =
        super.getSlideNJumpMoves(
          sq, steps, oneStep || [V.KNIGHT, V.KING].includes(pg))
        .filter(m => {
          return (
            (piece != V.PAWN || m.end.x != lastRank) &&
            (moves.every(mv => mv.end.x != m.end.x || mv.end.y != m.end.y))
          );
        });
      moves = moves.concat(extraMoves);
    });
    return moves;
  }

  filterValid(moves) {
    return moves;
  }
  getCheckSquares() {
    return [];
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [-1, -1];
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING) {
      const v = move.vanish[1];
      this.kingPos[v.c] = [v.x, v.y];
    }
  }

  getCurrentScore() {
    const c = this.turn;
    if (this.kingPos[c][0] < 0) return (c == 'w' ? "0-1" : "1-0");
    // It seems that there is always a possible move (TODO: check this)
    return "*";
  }

  getNotation(move) {
    // Translate final and initial square
    const initSquare = V.CoordsToSquare(move.start);
    const finalSquare = V.CoordsToSquare(move.end);
    const piece = this.getPiece(move.start.x, move.start.y);

    // Since pieces and pawns could move like knight,
    // indicate start and end squares
    let notation =
      piece.toUpperCase() +
      initSquare +
      (move.vanish.length > move.appear.length ? "x" : "") +
      finalSquare

    if (
      piece == V.PAWN &&
      move.appear.length > 0 &&
      move.appear[0].p != V.PAWN
    ) {
      // Promotion
      notation += "=" + move.appear[0].p.toUpperCase();
    }

    return notation;
  }

};
