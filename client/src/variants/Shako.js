import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, sample } from "@/utils/alea";

export class ShakoRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        initShift: { w: 2, b: 2 },
        promotions:
          ChessRules.PawnSpecs.promotions.concat([V.ELEPHANT, V.CANNON])
      }
    );
  }

  static get ELEPHANT() {
    return "e";
  }

  static get CANNON() {
    return "c";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.ELEPHANT, V.CANNON]);
  }

  getPpath(b) {
    const prefix = [V.ELEPHANT, V.CANNON].includes(b[1]) ? "Shako/" : "";
    return prefix + b;
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        e: [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
          [-2, -2],
          [-2, 2],
          [2, -2],
          [2, 2]
        ]
      }
    );
  }

  static get size() {
    return { x: 10, y: 10};
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.ELEPHANT:
        return this.getPotentialElephantMoves([x, y]);
      case V.CANNON:
        return this.getPotentialCannonMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialElephantMoves([x, y]) {
    return this.getSlideNJumpMoves([x, y], V.steps[V.ELEPHANT], "oneStep");
  }

  getPotentialCannonMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    // Look in every direction until an obstacle (to jump) is met
    for (const step of V.steps[V.ROOK]) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        i += step[0];
        j += step[1];
      }
      // Then, search for an enemy
      i += step[0];
      j += step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.getColor(i, j) == oppCol)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    if (x != (c == "w" ? V.size.x - 2 : 1) || y != this.INIT_COL_KING[c])
      return []; //x isn't second rank, or king has moved (shortcut)

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook:
    const finalSquares = [
      [3, 4],
      [7, 6]
    ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= V.size.y) continue;
      // If this code is reached, rook and king are on initial position

      const rookPos = this.castleFlags[c][castleSide];

      // Nothing on the path of the king ? (and no checks)
      const castlingPiece = this.getPiece(x, rookPos);
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          this.isAttacked([x, i], oppCol) ||
          (this.board[x][i] != V.EMPTY &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c ||
              ![V.KING, castlingPiece].includes(this.getPiece(x, i))))
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);

      // Nothing on the path to the rook?
      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }

      // Nothing on final squares, except maybe king and castling rook?
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

      // If this code is reached, castle is valid
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
      this.isAttackedByElephant(sq, color) ||
      this.isAttackedByCannon(sq, color)
    );
  }

  isAttackedByElephant(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.ELEPHANT, V.steps[V.ELEPHANT], "oneStep"
      )
    );
  }

  isAttackedByCannon([x, y], color) {
    // Reversed process: is there an obstacle in line,
    // and a cannon next in the same line?
    for (const step of V.steps[V.ROOK]) {
      let [i, j] = [x+step[0], y+step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        // Keep looking in this direction
        i += step[0];
        j += step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.getPiece(i, j) == V.CANNON &&
          this.getColor(i, j) == color
        ) {
          return true;
        }
      }
    }
    return false;
  }

  updateCastleFlags(move, piece) {
    const c = V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 2 : 1);
    // Update castling flags if rooks are moved
    const oppCol = this.turn;
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (piece == V.KING)
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    // NOTE: not "else if" because a rook could take an opposing rook
    if (
      move.end.x == oppFirstRank && //we took opponent rook?
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  static get VALUES() {
    return Object.assign(
      { e: 3, c: 5 },
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return (
        "c8c/ernbqkbnre/pppppppppp/91/91/91/91/PPPPPPPPPP/ERNBQKBNRE/C8C " +
        "w 0 bibi -"
      );
    }

    let pieces = { w: new Array(10), b: new Array(10) };
    let flags = "";
    // Shuffle pieces on second (and before-last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(10);

      // Get random squares for bishops + elephants
      const be1Pos = sample([0, 2, 4, 6, 8], 2);
      const be2Pos = sample([1, 3, 5, 7, 9], 2);
      const bishop1Pos = be1Pos[0];
      const bishop2Pos = be2Pos[0];
      const elephant1Pos = be1Pos[1];
      const elephant2Pos = be2Pos[1];
      // Remove chosen squares
      (be1Pos.concat(be2Pos)).sort((x, y) => y - x).forEach(pos => {
        positions.splice(pos, 1);
      });

      let randIndex = randInt(6);
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

      pieces[c][elephant1Pos] = "e";
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      pieces[c][elephant2Pos] = "e";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    // Add turn + flags + enpassant
    return (
      "c8c/" + pieces["b"].join("") +
      "/pppppppppp/91/91/91/91/PPPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() + "/C8C" +
      " w 0 " + flags + " -"
    );
  }
};
