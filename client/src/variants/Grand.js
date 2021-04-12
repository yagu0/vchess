import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class GrandRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") return !!enpassant.match(/^([a-j][0-9]{1,2},?)+$/);
    return true;
  }

  getPpath(b) {
    return ([V.MARSHALL, V.CARDINAL].includes(b[1]) ? "Grand/" : "") + b;
  }

  static get size() {
    return { x: 10, y: 10 };
  }

  // Rook + knight:
  static get MARSHALL() {
    return "m";
  }

  // Bishop + knight
  static get CARDINAL() {
    return "c";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.MARSHALL, V.CARDINAL]);
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.MARSHALL:
        return this.getPotentialMarshallMoves([x, y]);
      case V.CARDINAL:
        return this.getPotentialCardinalMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  // Special pawn rules: promotions to captured friendly pieces,
  // optional on ranks 8-9 and mandatory on rank 10.
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = (color == "w" ? sizeX - 3 : 2);
    const lastRanks =
      color == "w" ? [0, 1, 2] : [sizeX - 1, sizeX - 2, sizeX - 3];
    // Always x+shiftX >= 0 && x+shiftX < sizeX, because no pawns on last rank
    let finalPieces = [V.PAWN];
    if (lastRanks.includes(x + shiftX)) {
      // Determine which promotion pieces are available:
      let promotionPieces = {
        [V.ROOK]: 2,
        [V.KNIGHT]: 2,
        [V.BISHOP]: 2,
        [V.QUEEN]: 1,
        [V.MARSHALL]: 1,
        [V.CARDINAL]: 1
      };
      for (let i=0; i<10; i++) {
        for (let j=0; j<10; j++) {
          if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
            const p = this.getPiece(i, j);
            if (![V.PAWN, V.KING].includes(p)) promotionPieces[p]--;
          }
        }
      }
      const availablePieces =
        Object.keys(promotionPieces).filter(k => promotionPieces[k] > 0);
      if (x + shiftX == lastRanks[0]) finalPieces = availablePieces;
      else Array.prototype.push.apply(finalPieces, availablePieces);
    }
    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      for (let piece of finalPieces)
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], { c: color, p: piece })
        );
      if (x == startRank && this.board[x + 2 * shiftX][y] == V.EMPTY)
        // Two squares jump
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
    }
    // Captures
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        this.canTake([x, y], [x + shiftX, y + shiftY])
      ) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
              c: color,
              p: piece
            })
          );
        }
      }
    }

    // En passant
    Array.prototype.push.apply(
      moves,
      this.getEnpassantCaptures([x, y], shiftX)
    );

    return moves;
  }

  getPotentialMarshallMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
  }

  getPotentialCardinalMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByMarshall(sq, color) ||
      this.isAttackedByCardinal(sq, color)
    );
  }

  isAttackedByMarshall(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.MARSHALL, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(sq, color, V.MARSHALL, V.steps[V.KNIGHT], 1)
    );
  }

  isAttackedByCardinal(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.CARDINAL, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(sq, color, V.CARDINAL, V.steps[V.KNIGHT], 1)
    );
  }

  static get VALUES() {
    return Object.assign(
      { c: 5, m: 7 }, //experimental
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0) {
      return (
        "r8r/1nbqkmcbn1/pppppppppp/91/91/91/91/PPPPPPPPPP/1NBQKMCBN1/R8R " +
        "w 0 -"
      );
    }

    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on second and before-last rank
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // ...random square for marshall
      randIndex = randInt(3);
      const marshallPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // ...random square for cardinal
      randIndex = randInt(2);
      const cardinalPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // King position is now fixed,
      const kingPos = positions[0];

      // Finally put the shuffled pieces in the board array
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][marshallPos] = "m";
      pieces[c][cardinalPos] = "c";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
    }
    return (
      "r8r/1" + pieces["b"].join("") + "1/" +
      "pppppppppp/91/91/91/91/PPPPPPPPPP/" +
      "1" + pieces["w"].join("").toUpperCase() + "1/R8R" +
      " w 0 -"
    );
  }

};
