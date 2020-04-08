import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class Doublemove1Rules extends ChessRules {
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

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    move.turn = this.turn + this.subTurn;
    V.PlayOnBoard(this.board, move);
    const epSq = this.getEpSquare(move);
    if (this.movesCount == 0) {
      // First move in game
      this.turn = "b";
      this.epSquares.push([epSq]);
      this.movesCount = 1;
    }
    // Does this move give check on subturn 1? If yes, skip subturn 2
    else if (this.subTurn == 1 && this.underCheck(V.GetOppCol(this.turn))) {
      this.turn = V.GetOppCol(this.turn);
      this.epSquares.push([epSq]);
      move.checkOnSubturn1 = true;
      this.movesCount++;
    } else {
      if (this.subTurn == 2) {
        this.turn = V.GetOppCol(this.turn);
        let lastEpsq = this.epSquares[this.epSquares.length - 1];
        lastEpsq.push(epSq);
      } else {
        this.epSquares.push([epSq]);
        this.movesCount++;
      }
      this.subTurn = 3 - this.subTurn;
    }
    this.postPlay(move);
  }

  postPlay(move) {
    const c = move.turn.charAt(0);
    const piece = move.vanish[0].p;
    const firstRank = c == "w" ? V.size.x - 1 : 0;

    if (piece == V.KING && move.appear.length > 0) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [V.size.y, V.size.y];
      return;
    }
    const oppCol = V.GetOppCol(c);
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    } else if (
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
    if (this.movesCount == 1 || !!move.checkOnSubturn1 || this.subTurn == 2) {
      // The move may not be full, but is fully undone:
      this.epSquares.pop();
      // Moves counter was just incremented:
      this.movesCount--;
    } else {
      // Undo the second half of a move
      let lastEpsq = this.epSquares[this.epSquares.length - 1];
      lastEpsq.pop();
    }
    this.turn = move.turn[0];
    this.subTurn = parseInt(move.turn[1]);
    super.postUndo(move);
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 7, //slightly less than in orthodox game
      k: 1000
    };
  }

  // No alpha-beta here, just adapted min-max at depth 2(+1)
  getComputerMove() {
    const maxeval = V.INFINITY;
    const color = this.turn;
    const oppCol = V.GetOppCol(this.turn);

    // Search best (half) move for opponent turn
    const getBestMoveEval = () => {
      let score = this.getCurrentScore();
      if (score != "*") {
        if (score == "1/2") return 0;
        return maxeval * (score == "1-0" ? 1 : -1);
      }
      let moves = this.getAllValidMoves();
      let res = oppCol == "w" ? -maxeval : maxeval;
      for (let m of moves) {
        this.play(m);
        score = this.getCurrentScore();
        // Now turn is oppCol,2 if m doesn't give check
        // Otherwise it's color,1. In both cases the next test makes sense
        if (score != "*") {
          if (score == "1/2")
            res = oppCol == "w" ? Math.max(res, 0) : Math.min(res, 0);
          else {
            // Found a mate
            this.undo(m);
            return maxeval * (score == "1-0" ? 1 : -1);
          }
        }
        const evalPos = this.evalPosition();
        res = oppCol == "w" ? Math.max(res, evalPos) : Math.min(res, evalPos);
        this.undo(m);
      }
      return res;
    };

    let moves11 = this.getAllValidMoves();
    let doubleMoves = [];
    // Rank moves using a min-max at depth 2
    for (let i = 0; i < moves11.length; i++) {
      this.play(moves11[i]);
      if (this.turn != color) {
        // We gave check with last move: search the best opponent move
        doubleMoves.push({ moves: [moves11[i]], eval: getBestMoveEval() });
      } else {
        let moves12 = this.getAllValidMoves();
        for (let j = 0; j < moves12.length; j++) {
          this.play(moves12[j]);
          doubleMoves.push({
            moves: [moves11[i], moves12[j]],
            eval: getBestMoveEval()
          });
          this.undo(moves12[j]);
        }
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

    const selected = doubleMoves[randInt(candidates.length)].moves;
    if (selected.length == 1) return selected[0];
    return selected;
  }
};
