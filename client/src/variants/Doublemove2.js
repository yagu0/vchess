import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class Doublemove2Rules extends ChessRules {
  static IsGoodEnpassant(enpassant) {
    const squares = enpassant.split(",");
    if (squares.length > 2) return false;
    for (let sq of squares) {
      if (sq != "-") {
        const ep = V.SquareToCoords(sq);
        if (isNaN(ep.x) || !V.OnBoard(ep)) return false;
      }
    }
    return true;
  }

  // There may be 2 enPassant squares (if 2 pawns jump 2 squares in same turn)
  getEnpassantFen() {
    return this.epSquares[this.epSquares.length - 1].map(
      epsq => epsq === undefined
        ? "-" //no en-passant
        : V.CoordsToSquare(epsq)
    ).join(",");
  }

  setOtherVariables(fen) {
    const parsedFen = V.ParseFen(fen);
    this.setFlags(parsedFen.flags);
    this.epSquares = [parsedFen.enpassant.split(",").map(sq => {
      if (sq != "-") return V.SquareToCoords(sq);
      return undefined;
    })];
    this.scanKings(fen);
    // Extract subTurn from turn indicator: "w" (first move), or
    // "w1" or "w2" white subturn 1 or 2, and same for black
    this.turn = parsedFen.turn;
    this.subTurn = 1;
  }

  getEnpassantCaptures([x, y], shiftX) {
    let moves = [];
    // En passant: always OK if subturn 1,
    // OK on subturn 2 only if enPassant was played at subturn 1
    // (and if there are two e.p. squares available).
    const Lep = this.epSquares.length;
    const epSquares = this.epSquares[Lep - 1]; //always at least one element
    let epSqs = [];
    epSquares.forEach(sq => {
      if (sq) epSqs.push(sq);
    });
    if (epSqs.length == 0) return moves;
    const oppCol = V.GetOppCol(this.getColor(x, y));
    for (let sq of epSqs) {
      if (
        this.subTurn == 1 ||
        (epSqs.length == 2 &&
          // Was this en-passant capture already played at subturn 1 ?
          // (Or maybe the opponent filled the en-passant square with a piece)
          this.board[epSqs[0].x][epSqs[0].y] != V.EMPTY)
      ) {
        if (
          sq.x == x + shiftX &&
          Math.abs(sq.y - y) == 1 &&
          // Add condition "enemy pawn must be present"
          this.getPiece(x, sq.y) == V.PAWN &&
          this.getColor(x, sq.y) == oppCol
        ) {
          let epMove = this.getBasicMove([x, y], [sq.x, sq.y]);
          epMove.vanish.push({
            x: x,
            y: sq.y,
            p: "p",
            c: oppCol
          });
          moves.push(epMove);
        }
      }
    }
    return moves;
  }

  isAttacked() {
    // Goal is king capture => no checks
    return false;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.kingPos[color][0] < 0) return (color == 'w' ? "0-1" : "1-0");
    return "*";
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    const epSq = this.getEpSquare(move);
    if (this.subTurn == 2) {
      let lastEpsq = this.epSquares[this.epSquares.length - 1];
      lastEpsq.push(epSq);
      this.turn = V.GetOppCol(this.turn);
    }
    else {
      this.epSquares.push([epSq]);
      this.movesCount++;
      if (
        this.movesCount == 1 ||
        // King is captured at subTurn 1?
        (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      ) {
        this.turn = "b";
      }
    }
    if (this.movesCount > 1) this.subTurn = 3 - this.subTurn;
    this.postPlay(move);
  }

  postPlay(move) {
    const c = move.vanish[0].c;
    const piece = move.vanish[0].p;
    const firstRank = c == "w" ? V.size.x - 1 : 0;

    if (piece == V.KING && move.appear.length > 0) {
      this.kingPos[c] = [move.appear[0].x, move.appear[0].y];
      this.castleFlags[c] = [V.size.y, V.size.y];
      return;
    }
    const oppCol = V.GetOppCol(c);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING) {
      // Opponent's king is captured, game over
      this.kingPos[oppCol] = [-1, -1];
      move.captureKing = true; //for undo
    }
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    else if (
      move.end.x == oppFirstRank && //we took opponent rook?
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.subTurn == 2 || this.movesCount == 1 || !!move.captureKing) {
      this.epSquares.pop();
      this.movesCount--;
      if (this.movesCount == 0) this.turn = "w";
    }
    else {
      let lastEpsq = this.epSquares[this.epSquares.length - 1];
      lastEpsq.pop();
      this.turn = V.GetOppCol(this.turn);
    }
    if (this.movesCount > 0) this.subTurn = 3 - this.subTurn;
    this.postUndo(move);
  }

  postUndo(move) {
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      // Opponent's king was captured
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
    super.postUndo(move);
  }

  // No alpha-beta here, just adapted min-max at depth 2(+1)
  getComputerMove() {
    const maxeval = V.INFINITY;
    const color = this.turn;
    const oppCol = V.GetOppCol(this.turn);

    // Search best (half) move for opponent turn
    const getBestMoveEval = () => {
      let score = this.getCurrentScore();
      if (score != "*") return maxeval * (score == "1-0" ? 1 : -1);
      let moves = this.getAllValidMoves();
      let res = oppCol == "w" ? -maxeval : maxeval;
      for (let m of moves) {
        this.play(m);
        score = this.getCurrentScore();
        if (score != "*") {
          // King captured
          this.undo(m);
          return maxeval * (score == "1-0" ? 1 : -1);
        }
        const evalPos = this.evalPosition();
        res = oppCol == "w" ? Math.max(res, evalPos) : Math.min(res, evalPos);
        this.undo(m);
      }
      return res;
    };

    const moves11 = this.getAllValidMoves();
    if (this.movesCount == 0)
      // First white move at random:
      return moves11[randInt(moves11.length)];
    let doubleMoves = [];
    // Rank moves using a min-max at depth 2
    for (let i = 0; i < moves11.length; i++) {
      this.play(moves11[i]);
      const moves12 = this.getAllValidMoves();
      for (let j = 0; j < moves12.length; j++) {
        this.play(moves12[j]);
        doubleMoves.push({
          moves: [moves11[i], moves12[j]],
          // Small fluctuations to uniformize play a little
          eval: getBestMoveEval() + 0.05 - Math.random() / 10
        });
        this.undo(moves12[j]);
      }
      this.undo(moves11[i]);
    }

    doubleMoves.sort((a, b) => {
      return (color == "w" ? 1 : -1) * (b.eval - a.eval);
    });
    let candidates = [0]; //indices of candidates moves
    for (
      let i = 1;
      i < doubleMoves.length && doubleMoves[i].eval == doubleMoves[0].eval;
      i++
    ) {
      candidates.push(i);
    }
    return doubleMoves[randInt(candidates.length)].moves;
  }
};
