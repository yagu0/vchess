import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class ColorboundRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: V.PIECES }
    );
  }

  getPpath(b) {
    if ([V.C_ROOK, V.C_KNIGHT, V.C_BISHOP, V.C_QUEEN].includes(b[1]))
      return "Colorbound/" + b;
    return b;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "dhaskahd/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 ahah -";

    // Mapping white --> black (at least at start):
    const piecesMap = {
      'r': 'd',
      'n': 'h',
      'b': 'a',
      'q': 's',
      'k': 'k'
    };

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'].map(p => piecesMap[p]);
        flags += flags;
        break;
      }

      // TODO: same code as in base_rules. Should extract and factorize?

      let positions = ArrayFun.range(8);

      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      if (c == 'b') pieces[c] = pieces[c].map(p => piecesMap[p]);
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    // Add turn + flags + enpassant
    return (
      pieces["b"].join("") +
      "/8/pppppppp/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " -"
    );
  }

  static get C_ROOK() {
    return 'd';
  }
  static get C_KNIGHT() {
    return 'h';
  }
  static get C_BISHOP() {
    return 'a';
  }
  static get C_QUEEN() {
    return 's';
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat([V.C_ROOK, V.C_KINGHT, V.C_BISHOP, V.C_QUEEN])
    );
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.C_ROOK:
        return this.getPotentialC_rookMoves([x, y]);
      case V.C_KNIGHT:
        return this.getPotentialC_knightMoves([x, y]);
      case V.C_BISHOP:
        return this.getPotentialC_bishopMoves([x, y]);
      case V.C_QUEEN:
        return this.getPotentialC_queenMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
    return [];
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        // Dabbabah
        'd': [
          [-2, 0],
          [0, -2],
          [2, 0],
          [0, 2]
        ],
        // Alfil
        'a': [
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2]
        ],
        // Ferz
        'f': [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        ]
      }
    );
  }

  getPotentialC_rookMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps['d'], "oneStep"))
    );
  }

  getPotentialC_knightMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps['a'], "oneStep").concat(
      this.getSlideNJumpMoves(sq, V.steps[V.ROOK], "oneStep"))
    );
  }

  getPotentialC_bishopMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps['d'], "oneStep").concat(
      this.getSlideNJumpMoves(sq, V.steps['a'], "oneStep")).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep"))
    );
  }

  getPotentialC_queenMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
        this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"))
    );
  }

  // TODO: really find a way to avoid duolicating most of the castling code
  // each time: here just the queenside castling squares change for black.
  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    if (x != (c == "w" ? V.size.x - 1 : 0) || y != this.INIT_COL_KING[c])
      return [];

    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook:
    const finalSquares = [
      // Black castle long in an unusual way:
      (c == 'w' ? [2, 3] : [1, 2]),
      [V.size.y - 2, V.size.y - 3]
    ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= V.size.y) continue;

      const rookPos = this.castleFlags[c][castleSide];
      const castlingPiece = this.getPiece(x, rookPos);
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          this.isAttacked([x, i], oppCol) ||
          (this.board[x][i] != V.EMPTY &&
            (this.getColor(x, i) != c ||
              ![V.KING, castlingPiece].includes(this.getPiece(x, i))))
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);

      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }

      for (i = 0; i < 2; i++) {
        if (
          finalSquares[castleSide][i] != rookPos &&
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          (
            this.getPiece(x, finalSquares[castleSide][i]) != V.KING ||
            this.getColor(x, finalSquares[castleSide][i]) != c
          )
        ) {
          continue castlingCheck;
        }
      }

      moves.push(
        new Move({
          appear: [
            new PiPo({
              x: x,
              y: finalSquares[castleSide][0],
              p: V.KING,
              c: c
            }),
            new PiPo({
              x: x,
              y: finalSquares[castleSide][1],
              p: castlingPiece,
              c: c
            })
          ],
          vanish: [
            new PiPo({ x: x, y: y, p: V.KING, c: c }),
            new PiPo({ x: x, y: rookPos, p: castlingPiece, c: c })
          ],
          end:
            Math.abs(y - rookPos) <= 2
              ? { x: x, y: rookPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByC_rook(sq, color) ||
      this.isAttackedByC_knight(sq, color) ||
      this.isAttackedByC_bishop(sq, color) ||
      this.isAttackedByC_queen(sq, color)
    );
  }

  isAttackedByC_rook(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.C_ROOK, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.C_ROOK, V.steps['d'], "oneStep")
    );
  }

  isAttackedByC_knight(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.C_KNIGHT, V.steps[V.ROOK], "oneStep") ||
      this.isAttackedBySlideNJump(
        sq, color, V.C_KNIGHT, V.steps['a'], "oneStep")
    );
  }

  isAttackedByC_bishop(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.C_BISHOP, V.steps['d'], "oneStep") ||
      this.isAttackedBySlideNJump(
        sq, color, V.C_BISHOP, V.steps['a'], "oneStep") ||
      this.isAttackedBySlideNJump(
        sq, color, V.C_BISHOP, V.steps['f'], "oneStep")
    );
  }

  isAttackedByC_queen(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.C_QUEEN, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.C_ROOK, V.steps[V.KNIGHT], "oneStep")
    );
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        d: 4,
        h: 3,
        a: 5,
        s: 6
      }
    );
  }
};
