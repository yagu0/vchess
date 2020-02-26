import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { sample, randInt } from "@/utils/alea";

export const VariantRules = class WildebeestRules extends ChessRules {
  static get size() {
    return { x: 10, y: 11 };
  }

  static get CAMEL() {
    return "c";
  }
  static get WILDEBEEST() {
    return "w";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.CAMEL, V.WILDEBEEST]);
  }

  static get steps() {
    return Object.assign(
      ChessRules.steps, //add camel moves:
      {
        c: [
          [-3, -1],
          [-3, 1],
          [-1, -3],
          [-1, 3],
          [1, -3],
          [1, 3],
          [3, -1],
          [3, 1]
        ]
      }
    );
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

  getPpath(b) {
    return ([V.CAMEL, V.WILDEBEEST].includes(b[1]) ? "Wildebeest/" : "") + b;
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
      case V.CAMEL:
        return this.getPotentialCamelMoves([x, y]);
      case V.WILDEBEEST:
        return this.getPotentialWildebeestMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  // Pawns jump 2 or 3 squares, and promote to queen or wildebeest
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRanks = color == "w" ? [sizeX - 2, sizeX - 3] : [1, 2];
    const lastRank = color == "w" ? 0 : sizeX - 1;
    const finalPieces = x + shiftX == lastRank
      ? [V.WILDEBEEST, V.QUEEN]
      : [V.PAWN];

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

  // TODO: wildebeest castle

  getPotentialCamelMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.CAMEL], "oneStep");
  }

  getPotentialWildebeestMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.KNIGHT].concat(V.steps[V.CAMEL]),
      "oneStep"
    );
  }

  isAttacked(sq, colors) {
    return (
      super.isAttacked(sq, colors) ||
      this.isAttackedByCamel(sq, colors) ||
      this.isAttackedByWildebeest(sq, colors)
    );
  }

  isAttackedByCamel(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.CAMEL,
      V.steps[V.CAMEL],
      "oneStep"
    );
  }

  isAttackedByWildebeest(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.WILDEBEEST,
      V.steps[V.KNIGHT].concat(V.steps[V.CAMEL]),
      "oneStep"
    );
  }

  getCurrentScore() {
    if (this.atLeastOneMove())
      // game not over
      return "*";

    // No valid move: game is lost (stalemate is a win)
    return this.turn == "w" ? "0-1" : "1-0";
  }

  static get VALUES() {
    return Object.assign(
      ChessRules.VALUES,
      { c: 3, w: 7 } //experimental
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen() {
    let pieces = { w: new Array(10), b: new Array(10) };
    for (let c of ["w", "b"]) {
      let positions = ArrayFun.range(11);

      // Get random squares for bishops + camels (different colors)
      let randIndexes = sample(ArrayFun.range(6), 2).map(i => {
        return 2 * i;
      });
      let bishop1Pos = positions[randIndexes[0]];
      let camel1Pos = positions[randIndexes[1]];
      // The second bishop (camel) must be on a square of different color
      let randIndexes_tmp = sample(ArrayFun.range(5), 2).map(i => {
        return 2 * i + 1;
      });
      let bishop2Pos = positions[randIndexes_tmp[0]];
      let camel2Pos = positions[randIndexes_tmp[1]];
      for (let idx of randIndexes.concat(randIndexes_tmp).sort((a, b) => {
        return b - a;
      })) {
        //largest indices first
        positions.splice(idx, 1);
      }

      let randIndex = randInt(7);
      let knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(6);
      let knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(5);
      let queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Random square for wildebeest
      randIndex = randInt(4);
      let wildebeestPos = positions[randIndex];
      positions.splice(randIndex, 1);

      let rook1Pos = positions[0];
      let kingPos = positions[1];
      let rook2Pos = positions[2];

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][camel1Pos] = "c";
      pieces[c][camel2Pos] = "c";
      pieces[c][wildebeestPos] = "w";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
    }
    return (
      pieces["b"].join("") +
      "/ppppppppppp/11/11/11/11/11/11/PPPPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 1111 -"
    );
  }
};
