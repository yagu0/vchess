import { ChessRules } from "@/base_rules";

// Pawns relayed by one square at a time (but with relaying pioece movements)
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

    // Expand possible moves if guarded by friendly pieces:
    // --> Pawns cannot be promoted through a relaying move (thus 8th rank forbidden)
    // TODO

    return moves;
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
