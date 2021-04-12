import { ChessRules } from "@/base_rules";
import { Antiking2Rules } from "@/variants/Antiking2";

export class MesmerRules extends ChessRules {

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check arrival of last hypnotizing move (if any)
    if (
      !fenParsed.hSquare ||
      (fenParsed.hSquare != "-" && !fenParsed.hSquare.match(/^[a-h][1-8]$/))
    ) {
      return false;
    }
    return true;
  }

  static get MESMERIST() {
    return 'm';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.MESMERIST]);
  }

  getPpath(b) {
    return (b.charAt(1) == 'm' ? "Mesmer/" : "") + b;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      { hSquare: fenParts[5] },
      ChessRules.ParseFen(fen)
    );
  }

  static GenRandInitFen(options) {
    const antikingFen = Antiking2Rules.GenRandInitFen(options);
    return antikingFen.replace('a', 'M').replace('A', 'm') + " -";
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const parsedFen = V.ParseFen(fen);
    this.hSquares = [
      parsedFen.hSquare != "-"
        ? V.SquareToCoords(parsedFen.hSquare)
        : null
    ];
  }

  scanKings(fen) {
    super.scanKings(fen);
    // Squares of white and black mesmerist:
    this.mesmerPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "m":
            this.mesmerPos["b"] = [i, k];
            break;
          case "M":
            this.mesmerPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  getFen() {
    const L = this.hSquares.length;
    return (
      super.getFen() + " " +
      (!this.hSquares[L-1] ? "-" : V.CoordsToSquare(this.hSquares[L-1]))
    );
  }

  canIplay(side) {
    // Wrong, but sufficient approximation let's say
    return this.turn == side;
  }

  canTake([x1, y1], [x2, y2]) {
    const c = this.turn;
    const c1 = this.getColor(x1, y1);
    const c2 = this.getColor(x2, y2);
    return (c == c1 && c1 != c2) || (c != c1 && c1 == c2);
  }

  getPotentialMovesFrom([x, y]) {
    const L = this.hSquares.length;
    const lh = this.hSquares[L-1];
    if (!!lh && lh.x == x && lh.y == y) return [];
    const c = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    if (c == this.turn) {
      if (piece == V.MESMERIST) return this.getPotentialMesmeristMoves([x, y]);
      return super.getPotentialMovesFrom([x, y]);
    }
    // Playing opponent's pieces: hypnotizing moves. Allowed?
    if (piece == V.MESMERIST || !this.isAttackedByMesmerist([x, y], this.turn))
      return [];
    const moves =
      piece == V.KING
        // No castling with enemy king (...yes, should eat it but...)
        ? super.getSlideNJumpMoves(
          [x, y], V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1)
        : super.getPotentialMovesFrom([x, y]);
    return moves;
  }

  // Moves like a queen without capturing
  getPotentialMesmeristMoves([x, y]) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    let moves = [];
    for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        i += step[0];
        j += step[1];
      }
    }
    return moves;
  }

  isAttackedByMesmerist(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq, color, V.MESMERIST, V.steps[V.ROOK].concat(V.steps[V.BISHOP]))
    );
  }

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    let enpassantMove = null;
    const c = this.getColor(x, y);
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1 &&
      // Next conditions to avoid capturing self hypnotized pawns:
      this.board[x][epSquare.y] != V.EMPTY &&
      this.getColor(x, epSquare.y) != c //TODO: probably redundant
    ) {
      enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: this.board[x][epSquare.y].charAt(1),
        c: this.getColor(x, epSquare.y)
      });
    }
    return !!enpassantMove ? [enpassantMove] : [];
  }

  // TODO: avoid following code duplication, by using getColor()
  // instead of this.turn at the beginning of 2 next methods
  addPawnMoves([x1, y1], [x2, y2], moves, promotions) {
    let finalPieces = [V.PAWN];
    const color = this.getColor(x1, y1);
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    if (x2 == lastRank) finalPieces = V.PawnSpecs.promotions;
    let tr = null;
    for (let piece of finalPieces) {
      tr = (piece != V.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  getPotentialPawnMoves([x, y], promotions) {
    const color = this.getColor(x, y);
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const forward = (color == 'w' ? -1 : 1);

    let moves = [];
    if (x + forward >= 0 && x + forward < sizeX) {
      if (this.board[x + forward][y] == V.EMPTY) {
        this.addPawnMoves([x, y], [x + forward, y], moves, promotions);
        if (
          ((color == 'w' && x == 6) || (color == 'b' && x == 1)) &&
          this.board[x + 2 * forward][y] == V.EMPTY
        ) {
          moves.push(this.getBasicMove([x, y], [x + 2 * forward, y]));
        }
      }
      for (let shiftY of [-1, 1]) {
        if (
          y + shiftY >= 0 && y + shiftY < sizeY &&
          this.board[x + forward][y + shiftY] != V.EMPTY &&
          this.canTake([x, y], [x + forward, y + shiftY])
        ) {
          this.addPawnMoves(
            [x, y], [x + forward, y + shiftY],
            moves, promotions
          );
        }
      }
    }
    Array.prototype.push.apply(moves,
                               this.getEnpassantCaptures([x, y], forward));
    return moves;
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.vanish[0].p == V.MESMERIST)
      this.mesmerPos[move.vanish[0].c] = [move.appear[0].x, move.appear[0].y];
    if (move.vanish[0].c == this.turn)
      this.hSquares.push({ x: move.appear[0].x, y: move.appear[0].y });
    else this.hSquares.push(null);
    if (move.vanish.length == 2) {
      if (move.vanish[1].p == V.KING)
        this.kingPos[move.vanish[1].c] = [-1, -1];
      else if (move.vanish[1].p == V.MESMERIST)
        this.mesmerPos[move.vanish[1].c] = [-1, -1]
    }
  }
  postUndo(move) {
    super.postUndo(move);
    if (move.vanish[0].p == V.MESMERIST)
      this.mesmerPos[move.vanish[0].c] = [move.vanish[0].x, move.vanish[0].y];
    this.hSquares.pop();
    if (move.vanish.length == 2) {
      const v = move.vanish[1];
      if (v.p == V.KING)
        this.kingPos[v.c] = [v.x, v.y];
      else if (v.p == V.MESMERIST)
        this.mesmerPos[v.c] = [v.x, v.y];
    }
  }

  getCheckSquares() {
    return [];
  }
  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    const c = this.turn;
    if (this.kingPos[c][0] < 0) return (c == 'w' ? "0-1" : "1-0");
    if (this.mesmerPos[c][0] < 0) return (c == 'w' ? "0-1" : "1-0");
    return "*";
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
