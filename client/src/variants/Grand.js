import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class GrandRules extends ChessRules {

  static get HasCastle() {
    return false;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check captures
    if (!fenParsed.captured || !fenParsed.captured.match(/^[0-9]{12,12}$/))
      return false;
    return true;
  }

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") return !!enpassant.match(/^([a-j][0-9]{1,2},?)+$/);
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { captured: fenParts[4] }
    );
  }

  getPpath(b) {
    return ([V.MARSHALL, V.CARDINAL].includes(b[1]) ? "Grand/" : "") + b;
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getCapturedFen();
  }

  getCapturedFen() {
    let counts = [...Array(12).fill(0)];
    let i = 0;
    for (let j = 0; j < V.PIECES.length; j++) {
      if ([V.KING, V.PAWN].includes(V.PIECES[j]))
        // No king captured, and pawns don't promote in pawns
        continue;
      counts[i] = this.captured["w"][V.PIECES[j]];
      counts[6 + i] = this.captured["b"][V.PIECES[j]];
      i++;
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const captured =
      V.ParseFen(fen).captured.split("").map(x => parseInt(x, 10));
    // Initialize captured pieces' counts from FEN
    this.captured = {
      w: {
        [V.ROOK]: captured[0],
        [V.KNIGHT]: captured[1],
        [V.BISHOP]: captured[2],
        [V.QUEEN]: captured[3],
        [V.MARSHALL]: captured[4],
        [V.CARDINAL]: captured[5]
      },
      b: {
        [V.ROOK]: captured[6],
        [V.KNIGHT]: captured[7],
        [V.BISHOP]: captured[8],
        [V.QUEEN]: captured[9],
        [V.MARSHALL]: captured[10],
        [V.CARDINAL]: captured[11]
      }
    };
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
    const promotionPieces = [
      V.ROOK,
      V.KNIGHT,
      V.BISHOP,
      V.QUEEN,
      V.MARSHALL,
      V.CARDINAL
    ];

    // Always x+shiftX >= 0 && x+shiftX < sizeX, because no pawns on last rank
    let finalPieces = undefined;
    if (lastRanks.includes(x + shiftX)) {
      finalPieces = promotionPieces.filter(p => this.captured[color][p] > 0);
      if (x + shiftX != lastRanks[0]) finalPieces.push(V.PAWN);
    }
    else finalPieces = [V.PAWN];
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
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialCardinalMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
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
      this.isAttackedBySlideNJump(
        sq,
        color,
        V.MARSHALL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  isAttackedByCardinal(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.CARDINAL, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq,
        color,
        V.CARDINAL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.vanish.length == 2 && move.appear.length == 1)
      // Capture: update this.captured
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 1)
      this.captured[move.vanish[1].c][move.vanish[1].p]--;
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

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return (
        "r8r/1nbqkmcbn1/pppppppppp/91/91/91/91/PPPPPPPPPP/1NBQKMCBN1/R8R " +
        "w 0 - 00000000000000"
      );
    }

    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on second and before-last rank
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      let bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      let bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(6);
      let knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      let knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      let queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // ...random square for marshall
      randIndex = randInt(3);
      let marshallPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // ...random square for cardinal
      randIndex = randInt(2);
      let cardinalPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // King position is now fixed,
      let kingPos = positions[0];

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
      " w 0 " + " - 00000000000000"
    );
  }

};
