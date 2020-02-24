import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

// NOTE: initial setup differs from the original; see
// https://www.chessvariants.com/large.dir/freeling.html
export const VariantRules = class GrandRules extends ChessRules {
  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check captures
    if (!fenParsed.captured || !fenParsed.captured.match(/^[0-9]{14,14}$/))
      return false;
    return true;
  }

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

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(ChessRules.ParseFen(fen), { captured: fenParts[5] });
  }

  getPpath(b) {
    return ([V.MARSHALL, V.CARDINAL].includes(b[1]) ? "Grand/" : "") + b;
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getCapturedFen() {
    let counts = [...Array(14).fill(0)];
    let i = 0;
    for (let j = 0; j < V.PIECES.length; j++) {
      if (V.PIECES[j] == V.KING)
        //no king captured
        continue;
      counts[i] = this.captured["w"][V.PIECES[i]];
      counts[7 + i] = this.captured["b"][V.PIECES[i]];
      i++;
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenParsed = V.ParseFen(fen);
    // Initialize captured pieces' counts from FEN
    this.captured = {
      w: {
        [V.PAWN]: parseInt(fenParsed.captured[0]),
        [V.ROOK]: parseInt(fenParsed.captured[1]),
        [V.KNIGHT]: parseInt(fenParsed.captured[2]),
        [V.BISHOP]: parseInt(fenParsed.captured[3]),
        [V.QUEEN]: parseInt(fenParsed.captured[4]),
        [V.MARSHALL]: parseInt(fenParsed.captured[5]),
        [V.CARDINAL]: parseInt(fenParsed.captured[6])
      },
      b: {
        [V.PAWN]: parseInt(fenParsed.captured[7]),
        [V.ROOK]: parseInt(fenParsed.captured[8]),
        [V.KNIGHT]: parseInt(fenParsed.captured[9]),
        [V.BISHOP]: parseInt(fenParsed.captured[10]),
        [V.QUEEN]: parseInt(fenParsed.captured[11]),
        [V.MARSHALL]: parseInt(fenParsed.captured[12]),
        [V.CARDINAL]: parseInt(fenParsed.captured[13])
      }
    };
  }

  static get size() {
    return { x: 10, y: 10 };
  }

  static get MARSHALL() {
    return "m";
  } //rook+knight
  static get CARDINAL() {
    return "c";
  } //bishop+knight

  static get PIECES() {
    return ChessRules.PIECES.concat([V.MARSHALL, V.CARDINAL]);
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
        //3-squares move
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
    const startRanks = color == "w" ? [sizeX - 2, sizeX - 3] : [1, 2];
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
    } else finalPieces = [V.PAWN];
    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      for (let piece of finalPieces)
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], { c: color, p: piece })
        );
      if (startRanks.includes(x)) {
        if (this.board[x + 2 * shiftX][y] == V.EMPTY) {
          // Two squares jump
          moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
          if (x == startRanks[0] && this.board[x + 3 * shiftX][y] == V.EMPTY) {
            // Three squares jump
            moves.push(this.getBasicMove([x, y], [x + 3 * shiftX, y]));
          }
        }
      }
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
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1];
    if (epSquare) {
      for (let epsq of epSquare) {
        // TODO: some redundant checks
        if (epsq.x == x + shiftX && Math.abs(epsq.y - y) == 1) {
          var enpassantMove = this.getBasicMove([x, y], [epsq.x, epsq.y]);
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

  // TODO: different castle?

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

  isAttacked(sq, colors) {
    return (
      super.isAttacked(sq, colors) ||
      this.isAttackedByMarshall(sq, colors) ||
      this.isAttackedByCardinal(sq, colors)
    );
  }

  isAttackedByMarshall(sq, colors) {
    return (
      this.isAttackedBySlideNJump(sq, colors, V.MARSHALL, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq,
        colors,
        V.MARSHALL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  isAttackedByCardinal(sq, colors) {
    return (
      this.isAttackedBySlideNJump(sq, colors, V.CARDINAL, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq,
        colors,
        V.CARDINAL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  updateVariables(move) {
    super.updateVariables(move);
    if (move.vanish.length == 2 && move.appear.length == 1) {
      // Capture: update this.captured
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
    }
    if (move.vanish[0].p != move.appear[0].p) {
      // Promotion: update this.captured
      this.captured[move.vanish[0].c][move.appear[0].p]--;
    }
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    if (move.vanish.length == 2 && move.appear.length == 1)
      this.captured[move.vanish[1].c][move.vanish[1].p]--;
    if (move.vanish[0].p != move.appear[0].p)
      this.captured[move.vanish[0].c][move.appear[0].p]++;
  }

  static get VALUES() {
    return Object.assign(
      ChessRules.VALUES,
      { c: 5, m: 7 } //experimental
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen() {
    let pieces = { w: new Array(10), b: new Array(10) };
    // Shuffle pieces on first and last rank
    for (let c of ["w", "b"]) {
      let positions = ArrayFun.range(10);

      // Get random squares for bishops
      let randIndex = 2 * randInt(5);
      let bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(5) + 1;
      let bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(8);
      let knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(7);
      let knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(6);
      let queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // ...random square for marshall
      randIndex = randInt(5);
      let marshallPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // ...random square for cardinal
      randIndex = randInt(4);
      let cardinalPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks and king positions are now fixed, because of the ordering rook-king-rook
      let rook1Pos = positions[0];
      let kingPos = positions[1];
      let rook2Pos = positions[2];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][marshallPos] = "m";
      pieces[c][cardinalPos] = "c";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
    }
    return (
      pieces["b"].join("") +
      "/pppppppppp/10/10/10/10/10/10/PPPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 1111 - 00000000000000"
    );
  }
};
