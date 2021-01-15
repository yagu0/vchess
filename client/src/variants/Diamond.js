import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class DiamondRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "krbp4/rqnp4/nbpp4/pppp4/4PPPP/4PPBN/4PNQR/4PBRK w 0";
    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }
      // Get random squares for every piece, totally freely
      let positions = shuffle(ArrayFun.range(8));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      const rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=2; i<8; i++) {
          if (positions[i] % 2 != rem2) {
            [positions[1], positions[i]] = [positions[i], positions[1]];
            break;
          }
        }
      }
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].slice(0, 3).join("") + "p4/" +
      pieces["b"].slice(3, 6).join("") + "p4/" +
      pieces["b"].slice(6, 8).join("") + "pp4/" +
      "pppp4/4PPPP/" +
      "4PP" + pieces["w"].slice(6, 8).reverse().join("").toUpperCase() + "/" +
      "4P" + pieces["w"].slice(3, 6).reverse().join("").toUpperCase() + "/" +
      "4P" + pieces["w"].slice(0, 3).reverse().join("").toUpperCase() +
      " w 0"
    );
  }

  // Special pawns movements
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shift = (color == "w" ? -1 : 1);
    const lastRank = (color == "w" ? 0 : 7);

    // One square forward (diagonally along h1-a8)
    if (this.board[x + shift][y + shift] == V.EMPTY) {
      const finalPieces =
        [x + shift, y + shift].includes(lastRank)
          ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
          : [V.PAWN];
      for (let piece of finalPieces) {
        moves.push(
          this.getBasicMove(
            [x, y], [x + shift, y + shift], { c: color, p: piece })
        );
      }
    }
    // Capture
    for (let pShift of [[0, shift], [shift, 0]]) {
      if (
        this.board[x + pShift[0]][y + pShift[1]] != V.EMPTY &&
        this.canTake([x, y], [x + pShift[0], y + pShift[1]])
      ) {
        const finalPieces =
          [x + pShift[0], y + pShift[1]].includes(lastRank)
            ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
            : [V.PAWN];
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove(
              [x, y],
              [x + pShift[0], y + pShift[1]],
              {
                c: color,
                p: piece
              }
            )
          );
        }
      }
    }

    return moves;
  }

  isAttackedByPawn([x, y], color) {
    let pawnShift = (color == "w" ? 1 : -1);
    return (
      (
        x + pawnShift >= 0 && x + pawnShift < V.size.x &&
        this.getPiece(x + pawnShift, y) == V.PAWN &&
        this.getColor(x + pawnShift, y) == color
      )
      ||
      (
        y + pawnShift >= 0 && y + pawnShift < V.size.y &&
        this.getPiece(x, y + pawnShift) == V.PAWN &&
        this.getColor(x, y + pawnShift) == color
      )
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      const finalSquare = V.CoordsToSquare(move.end);
      let notation = "";
      if (move.vanish.length == 2)
        // Capture
        notation = "Px" + finalSquare;
      else {
        // No capture: indicate the initial square for potential ambiguity
        const startSquare = V.CoordsToSquare(move.start);
        notation = startSquare + finalSquare;
      }
      if (move.appear[0].p != V.PAWN)
        // Promotion
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    return super.getNotation(move); //all other pieces are orthodox
  }

};
