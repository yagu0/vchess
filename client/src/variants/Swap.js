import { ChessRules, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class SwapRules extends ChessRules {

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Local stack of swaps
    this.swaps = [];
    const smove = V.ParseFen(fen).smove;
    if (smove == "-") this.swaps.push(null);
    else {
      this.swaps.push({
        start: ChessRules.SquareToCoords(smove.substr(0, 2)),
        end: ChessRules.SquareToCoords(smove.substr(2))
      });
    }
    this.subTurn = 1;
  }

  static ParseFen(fen) {
    return Object.assign(
      ChessRules.ParseFen(fen),
      { smove: fen.split(" ")[5] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 6) return false;
    if (fenParts[5] != "-" && !fenParts[5].match(/^([a-h][1-8]){2}$/))
      return false;
    return true;
  }

  getPPpath(m) {
    if (m.appear.length == 1) return super.getPPpath(m);
    // Swap promotion:
    return m.appear[1].c + m.appear[1].p;
  }

  getSwapMoves([x1, y1], [x2, y2]) {
    let move = super.getBasicMove([x1, y1], [x2, y2]);
    move.appear.push(
      new PiPo({
        x: x1,
        y: y1,
        c: this.getColor(x2, y2),
        p: this.getPiece(x2, y2)
      })
    );
    const lastRank = (move.appear[1].c == 'w' ? 0 : 7);
    if (move.appear[1].p == V.PAWN && move.appear[1].x == lastRank) {
      // Promotion:
      move.appear[1].p = V.ROOK;
      let moves = [move];
      [V.KNIGHT, V.BISHOP, V.QUEEN].forEach(p => {
        let m = JSON.parse(JSON.stringify(move));
        m.appear[1].p = p;
        moves.push(m);
      });
      return moves;
    }
    return [move];
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 1) return super.getPotentialMovesFrom([x, y]);
    // SubTurn == 2: only swaps
    let moves = [];
    const color = this.turn;
    const piece = this.getPiece(x, y);
    const addSmoves = (i, j) => {
      if (this.getPiece(i, j) != piece || this.getColor(i, j) != color)
        Array.prototype.push.apply(moves, this.getSwapMoves([x, y], [i, j]));
    };
    switch (piece) {
      case V.PAWN: {
        const forward = (color == 'w' ? -1 : 1);
        const startRank = (color == 'w' ? [6, 7] : [0, 1]);
        if (
          x == startRank &&
          this.board[x + forward][y] == V.EMPTY &&
          this.board[x + 2 * forward][y] != V.EMPTY
        ) {
          // Swap using 2 squares move
          addSmoves(x + 2 * forward, y);
        }
        for (let shift of [-1, 0, 1]) {
          const [i, j] = [x + forward, y + shift];
          if (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) addSmoves(i, j);
        }
        break;
      }
      case V.KNIGHT:
        V.steps[V.KNIGHT].forEach(s => {
          const [i, j] = [x + s[0], y + s[1]];
          if (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) addSmoves(i, j);
        });
        break;
      case V.KING:
        V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
          const [i, j] = [x + s[0], y + s[1]];
          if (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) addSmoves(i, j);
        });
        break;
      case V.ROOK:
      case V.BISHOP:
      case V.QUEEN: {
        const steps =
          piece != V.QUEEN
            ? V.steps[piece]
            : V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
        steps.forEach(s => {
          let [i, j] = [x + s[0], y + s[1]];
          while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
            i += s[0];
            j += s[1];
          }
          if (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) addSmoves(i, j);
        });
        break;
      }
    }
    return moves;
  }

  // Does m2 un-do m1 ? (to disallow undoing swaps)
  oppositeSwaps(m1, m2) {
    return (
      !!m1 &&
      m1.start.x == m2.start.x &&
      m1.end.x == m2.end.x &&
      m1.start.y == m2.start.y &&
      m1.end.y == m2.end.y
    );
  }

  filterValid(moves) {
    const fmoves = super.filterValid(moves);
    if (this.subTurn == 1) return fmoves;
    return fmoves.filter(m => {
      const L = this.swaps.length; //at least 1: init from FEN
      return !this.oppositeSwaps(this.swaps[L - 1], m);
    });
  }

  static GenRandInitFen(options) {
    // Add empty smove:
    return ChessRules.GenRandInitFen(options) + " -";
  }

  getSmoveFen() {
    const L = this.swaps.length;
    return (
      !this.swaps[L - 1]
        ? "-"
        : ChessRules.CoordsToSquare(this.swaps[L - 1].start) +
          ChessRules.CoordsToSquare(this.swaps[L - 1].end)
    );
  }

  getFen() {
    return super.getFen() + " " + this.getSmoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getSmoveFen();
  }

  getCurrentScore() {
    const L = this.swaps.length;
    if (this.movesCount >= 2 && !this.swaps[L-1])
      // Opponent had no swap moves: I win
      return (this.turn == "w" ? "1-0" : "0-1");
    if (this.atLeastOneMove()) return "*";
    // No valid move: I lose
    return (this.turn == "w" ? "0-1" : "1-0");
  }

  noSwapAfter(move) {
    this.subTurn = 2;
    const res = !this.atLeastOneMove();
    this.subTurn = 1;
    return res;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    move.turn = [this.turn, this.subTurn];
    V.PlayOnBoard(this.board, move);
    let epSq = undefined;
    if (this.subTurn == 1) epSq = this.getEpSquare(move);
    if (this.movesCount == 0) {
      // First move in game
      this.turn = "b";
      this.epSquares.push(epSq);
      this.movesCount = 1;
    }
    // Any swap available after move? If no, skip subturn 2
    else if (this.subTurn == 1 && this.noSwapAfter(move)) {
      this.turn = V.GetOppCol(this.turn);
      this.epSquares.push(epSq);
      move.noSwap = true;
      this.movesCount++;
    }
    else {
      if (this.subTurn == 2) {
        this.turn = V.GetOppCol(this.turn);
        this.swaps.push({ start: move.start, end: move.end });
      }
      else {
        this.epSquares.push(epSq);
        this.movesCount++;
      }
      this.subTurn = 3 - this.subTurn;
    }
    this.postPlay(move);
  }

  postPlay(move) {
    const firstRank = { 7: 'w', 0: 'b' };
    // Did some king move?
    move.appear.forEach(a => {
      if (a.p == V.KING) {
        this.kingPos[a.c] = [a.x, a.y];
        this.castleFlags[a.c] = [V.size.y, V.size.y];
      }
    });
    for (let coords of [move.start, move.end]) {
      if (
        Object.keys(firstRank).includes(coords.x) &&
        this.castleFlags[firstRank[coords.x]].includes(coords.y)
      ) {
        const c = firstRank[coords.x];
        const flagIdx = (coords.y == this.castleFlags[c][0] ? 0 : 1);
        this.castleFlags[c][flagIdx] = V.size.y;
      }
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (move.turn[1] == 1) {
      // The move may not be full, but is fully undone:
      this.epSquares.pop();
      // Moves counter was just incremented:
      this.movesCount--;
    }
    else
      // Undo the second half of a move
      this.swaps.pop();
    this.turn = move.turn[0];
    this.subTurn = move.turn[1];
    this.postUndo(move);
  }

  postUndo(move) {
    // Did some king move?
    move.vanish.forEach(v => {
      if (v.p == V.KING) this.kingPos[v.c] = [v.x, v.y];
    });
  }

  // No alpha-beta here, just adapted min-max at depth 2(+1)
  getComputerMove() {
    const maxeval = V.INFINITY;
    const color = this.turn;
    const oppCol = V.GetOppCol(this.turn);

    // NOTE: searching best (half) move for opponent turn is a bit too slow.
    // => Only 2 half moves depth here.

    const moves11 = this.getAllValidMoves();
    if (this.movesCount == 0)
      // Just play first move at random:
      return moves11[randInt(moves11.length)];
    let bestMove = undefined;
    // Rank moves using a min-max at depth 2
    for (let i = 0; i < moves11.length; i++) {
      this.play(moves11[i]);
      if (!!moves11[i].noSwap) {
        // I lose
        if (!bestMove) bestMove = {
          moves: moves11[i],
          eval: (color == 'w' ? -maxeval : maxeval)
        };
      }
      else {
        let moves12 = this.getAllValidMoves();
        for (let j = 0; j < moves12.length; j++) {
          this.play(moves12[j]);
          const evalMove = this.evalPosition() + 0.05 - Math.random() / 10;
          if (
            !bestMove ||
            (color == 'w' && evalMove > bestMove.eval) ||
            (color == 'b' && evalMove < bestMove.eval)
          ) {
            bestMove = {
              moves: [moves11[i], moves12[j]],
              eval: evalMove
            };
          }
          this.undo(moves12[j]);
        }
      }
      this.undo(moves11[i]);
    }
    return bestMove.moves;
  }

  getNotation(move) {
    if (move.appear.length == 1)
      // Normal move
      return super.getNotation(move);
    if (move.appear[0].p == V.KING && move.appear[1].p == V.ROOK)
      // Castle
      return (move.end.y < move.start.y ? "0-0-0" : "0-0");
    // Swap
    return "S" + V.CoordsToSquare(move.start) + V.CoordsToSquare(move.end);
  }

};
