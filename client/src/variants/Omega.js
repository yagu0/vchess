import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class OmegaRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        initShift: { w: 2, b: 2 },
        threeSquares: true,
        promotions:
          ChessRules.PawnSpecs.promotions.concat([V.CHAMPION, V.WIZARD])
      }
    );
  }

  // For space between corners:
  static get NOTHING() {
    return "xx";
  }

  static board2fen(b) {
    if (b[0] == 'x') return 'x';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'x') return V.NOTHING;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b[0] == 'x') return "Omega/nothing";
    return ([V.CHAMPION, V.WIZARD].includes(b[1]) ? "Omega/" : "") + b;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (['x'].concat(V.PIECES).includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  // NOTE: keep this extensive check because the board has holes
  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const squares = enpassant.split(",");
      if (squares.length > 2) return false;
      for (let sq of squares) {
        const ep = V.SquareToCoords(sq);
        if (isNaN(ep.x) || !V.OnBoard(ep)) return false;
      }
    }
    return true;
  }

  static get size() {
    return { x: 12, y: 12 };
  }

  static OnBoard(x, y) {
    return (
      (x >= 1 && x <= 10 && y >= 1 && y <= 10) ||
      (x == 11 && [0, 11].includes(y)) ||
      (x == 0 && [0, 11].includes(y))
    );
  }

  // Dabbabah + alfil + wazir
  static get CHAMPION() {
    return "c";
  }

  // Camel + ferz
  static get WIZARD() {
    return "w";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.CHAMPION, V.WIZARD]);
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        w: [
          [-3, -1],
          [-3, 1],
          [-1, -3],
          [-1, 3],
          [1, -3],
          [1, 3],
          [3, -1],
          [3, 1],
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1]
        ],
        c: [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2],
          [-2, 0],
          [0, -2],
          [2, 0],
          [0, 2]
        ]
      }
    );
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return (
        "wxxxxxxxxxxw/xcrnbqkbnrcx/xppppppppppx/x91x/x91x/x91x/" +
        "x91x/x91x/x91x/xPPPPPPPPPPx/xCRNBQKBNRCx/WxxxxxxxxxxW " +
        "w 0 cjcj -"
      );
    }

    let pieces = { w: new Array(10), b: new Array(10) };
    let flags = "";
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(10);

      // Get random squares for bishops
      let randIndex = 2 * randInt(5);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(5) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for champions
      randIndex = 2 * randInt(4);
      let bishopSameColorPos = (bishop1Pos % 2 == 0 ? bishop1Pos : bishop2Pos);
      if (randIndex >= bishopSameColorPos) randIndex += 2;
      const champion1Pos = positions[randIndex];
      // The second champion must be on a square of different color
      randIndex_tmp = 2 * randInt(4) + 1;
      bishopSameColorPos = (bishop1Pos % 2 == 0 ? bishop1Pos : bishop2Pos);
      if (randIndex_tmp >= bishopSameColorPos) randIndex_tmp += 2;
      const champion2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for other pieces
      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks and king positions are now fixed
      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      pieces[c][champion1Pos] = "c";
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      pieces[c][champion2Pos] = "c";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    // Add turn + flags + enpassant
    return (
      "wxxxxxxxxxxw/" +
      "x" + pieces["b"].join("") +
      "x/xppppppppppx/x91x/x91x/x91x/x91x/x91x/x91x/xPPPPPPPPPPx/x" +
      pieces["w"].join("").toUpperCase() + "x" +
      "/WxxxxxxxxxxW " +
      "w 0 " + flags + " -"
    );
  }

  // There may be 2 enPassant squares (if pawn jump 3 squares)
  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    let res = "";
    this.epSquares[L - 1].forEach(sq => {
      res += V.CoordsToSquare(sq) + ",";
    });
    return res.slice(0, -1); //remove last comma
  }

  canTake([x1, y1], [x2, y2]) {
    return (
      // Cannot take wall :)
      this.board[x2][y2] != V.NOTHING &&
      this.getColor(x1, y1) !== this.getColor(x2, y2)
    );
  }

  // En-passant after 2-sq or 3-sq jumps
  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      let res = [];
      square.split(",").forEach(sq => {
        res.push(V.SquareToCoords(sq));
      });
      return res;
    }
    // Argument is a move:
    const move = moveOrSquare;
    const [sx, sy, ex] = [move.start.x, move.start.y, move.end.x];
    if (this.getPiece(sx, sy) == V.PAWN && Math.abs(sx - ex) >= 2) {
      const step = (ex - sx) / Math.abs(ex - sx);
      let res = [
        {
          x: sx + step,
          y: sy
        }
      ];
      if (sx + 2 * step != ex) {
        // 3-squares jump
        res.push({
          x: sx + 2 * step,
          y: sy
        });
      }
      return res;
    }
    return undefined; //default
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.CHAMPION:
        return this.getPotentialChampionMoves([x, y]);
      case V.WIZARD:
        return this.getPotentialWizardMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1];
    let moves = [];
    if (!!epSquare) {
      for (let epsq of epSquare) {
        // TODO: some redundant checks
        if (epsq.x == x + shiftX && Math.abs(epsq.y - y) == 1) {
          let enpassantMove = this.getBasicMove([x, y], [epsq.x, epsq.y]);
          // WARNING: the captured pawn may be diagonally behind us,
          // if it's a 3-squares jump and we take on 1st passing square
          const px = this.board[x][epsq.y] != V.EMPTY ? x : x - shiftX;
          enpassantMove.vanish.push({
            x: px,
            y: epsq.y,
            p: "p",
            c: this.getColor(px, epsq.y)
          });
          moves.push(enpassantMove);
        }
      }
    }
    return moves;
  }

  getPotentialChampionMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.CHAMPION], "oneStep");
  }

  getPotentialWizardMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.WIZARD], "oneStep");
  }

  getCastleMoves([x, y], castleInCheck) {
    const c = this.getColor(x, y);
    if (x != (c == "w" ? V.size.x - 2 : 1) || y != this.INIT_COL_KING[c])
      return []; //x isn't first rank, or king has moved (shortcut)

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook:
    const finalSquares = [
      [4, 5],
      [8, 7]
    ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= V.size.y) continue;
      // If this code is reached, rook and king are on initial position

      // NOTE: in some variants this is not a rook
      const rookPos = this.castleFlags[c][castleSide];
      if (this.board[x][rookPos] == V.EMPTY || this.getColor(x, rookPos) != c)
        // Rook is not here, or changed color (see Benedict)
        continue;

      // Nothing on the path of the king ? (and no checks)
      const castlingPiece = this.getPiece(x, rookPos);
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          (!castleInCheck && this.isAttacked([x, i], oppCol)) ||
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
      this.isAttackedByChampion(sq, color) ||
      this.isAttackedByWizard(sq, color)
    );
  }

  isAttackedByWizard(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.WIZARD, V.steps[V.WIZARD], "oneStep")
    );
  }

  isAttackedByChampion(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.CHAMPION, V.steps[V.CHAMPION], "oneStep")
    );
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

  static get SEARCH_DEPTH() {
    return 2;
  }

  // Values taken from https://omegachess.com/strategy.htm
  static get VALUES() {
    return {
      p: 1,
      n: 2,
      b: 4,
      r: 6,
      q: 12,
      w: 4,
      c: 4,
      k: 1000
    };
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (![V.EMPTY,V.NOTHING].includes(this.board[i][j])) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          evaluation += sign * V.VALUES[this.getPiece(i, j)];
        }
      }
    }
    return evaluation;
  }
};
