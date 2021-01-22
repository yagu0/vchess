import { ChessRules } from "@/base_rules";

export class HypnoticRules extends ChessRules {

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

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      { hSquare: fenParts[5] },
      ChessRules.ParseFen(fen)
    );
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness) + " -";
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
    if (c == this.turn) return super.getPotentialMovesFrom([x, y]);
    // Playing opponent's pieces: hypnotizing moves. Allowed?
    if (!this.isAttacked([x, y], this.turn)) return [];
    const moves =
      this.getPiece(x, y) == V.KING
        // No castling with enemy king (...yes, should eat it but...)
        ? super.getSlideNJumpMoves(
          [x, y], V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep")
        : super.getPotentialMovesFrom([x, y]);
    return moves;
  }

  getAllPotentialMoves() {
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    return potentialMoves;
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
    if (move.vanish[0].c == this.turn)
      this.hSquares.push({ x: move.appear[0].x, y: move.appear[0].y });
    else this.hSquares.push(null);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [-1, -1];
  }
  postUndo(move) {
    super.postUndo(move);
    this.hSquares.pop();
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
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
    return "*";
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
