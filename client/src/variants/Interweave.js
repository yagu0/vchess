import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";

export class InterweaveRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rbnkknbr/pppppppp/8/8/8/8/PPPPPPPP/RBNKKNBR w 0 - 000000";

    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Each pair of pieces on 2 colors:
      const composition = ['r', 'n', 'b', 'k', 'r', 'n', 'b', 'k'];
      let positions = shuffle(ArrayFun.range(4));
      for (let i = 0; i < 4; i++)
        pieces[c][2 * positions[i]] = composition[i];
      positions = shuffle(ArrayFun.range(4));
      for (let i = 0; i < 4; i++)
        pieces[c][2 * positions[i] + 1] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      // En-passant allowed, but no flags
      " w 0 - 000000"
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 4) Check captures
    if (!fenParsed.captured || !fenParsed.captured.match(/^[0-9]{6,6}$/))
      return false;
    return true;
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
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board. Exactly two per color.
    if (Object.values(kings).some(v => v != 2)) return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { captured: fenParts[4] }
    );
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getCapturedFen();
  }

  getCapturedFen() {
    let counts = [...Array(6).fill(0)];
    [V.ROOK, V.KNIGHT, V.BISHOP].forEach((p,idx) => {
      counts[idx] = this.captured["w"][p];
      counts[3 + idx] = this.captured["b"][p];
    });
    return counts.join("");
  }

  scanKings() {}

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const captured =
      V.ParseFen(fen).captured.split("").map(x => parseInt(x, 10));
    // Initialize captured pieces' counts from FEN
    this.captured = {
      w: {
        [V.ROOK]: captured[0],
        [V.KNIGHT]: captured[1],
        [V.BISHOP]: captured[2]
      },
      b: {
        [V.ROOK]: captured[3],
        [V.KNIGHT]: captured[4],
        [V.BISHOP]: captured[5]
      }
    };
    // Stack of "last move" only for intermediate captures
    this.lastMoveEnd = [null];
  }

  // Trim all non-capturing moves
  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length >= 2 || m.appear.length == 0);
  }

  // Stop at the first capture found (if any)
  atLeastOneCapture() {
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          V.KeepCaptures(this.getPotentialMovesFrom([i, j])).length > 0
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // En-passant after 2-sq jump
  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      // Enemy pawn initial column must be given too:
      let res = [];
      const epParts = square.split(",");
      res.push(V.SquareToCoords(epParts[0]));
      res.push(V.ColumnToCoord(epParts[1]));
      return res;
    }
    // Argument is a move:
    const move = moveOrSquare;
    const [sx, ex, sy, ey] =
      [move.start.x, move.end.x, move.start.y, move.end.y];
    if (
      move.vanish.length == 1 &&
      this.getPiece(sx, sy) == V.PAWN &&
      Math.abs(sx - ex) == 2 &&
      Math.abs(sy - ey) == 2
    ) {
      return [
        {
          x: (ex + sx) / 2,
          y: (ey + sy) / 2
        },
        // The arrival column must be remembered, because
        // potentially two pawns could be candidates to be captured:
        // one on our left, and one on our right.
        move.end.y
      ];
    }
    return undefined; //default
  }

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const epParts = enpassant.split(",");
      const epSq = V.SquareToCoords(epParts[0]);
      if (isNaN(epSq.x) || isNaN(epSq.y) || !V.OnBoard(epSq)) return false;
      const arrCol = V.ColumnToCoord(epParts[1]);
      if (isNaN(arrCol) || arrCol < 0 || arrCol >= V.size.y) return false;
    }
    return true;
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    return (
      V.CoordsToSquare(this.epSquares[L - 1][0]) +
      "," +
      V.CoordToColumn(this.epSquares[L - 1][1])
    );
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.PAWN:
        return this.getPotentialPawnMoves([x, y]);
      case V.ROOK:
        return this.getPotentialRookMoves([x, y]);
      case V.KNIGHT:
        return this.getPotentialKnightMoves([x, y]);
      case V.BISHOP:
        return this.getPotentialBishopMoves([x, y]);
      case V.KING:
        return this.getPotentialKingMoves([x, y]);
      // No queens
    }
    return [];
  }

  // Special pawns movements
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const potentialFinalPieces =
      [V.ROOK, V.KNIGHT, V.BISHOP].filter(p => this.captured[color][p] > 0);
    const lastRanks = (color == "w" ? [0, 1] : [sizeX - 1, sizeX - 2]);
    if (x + shiftX == lastRanks[0] && potentialFinalPieces.length == 0)
      // If no captured piece is available, the pawn cannot promote
      return [];

    const finalPieces1 =
      x + shiftX == lastRanks[0]
        ? potentialFinalPieces
        :
          x + shiftX == lastRanks[1]
            ? potentialFinalPieces.concat([V.PAWN])
            : [V.PAWN];
    // One square diagonally
    for (let shiftY of [-1, 1]) {
      if (this.board[x + shiftX][y + shiftY] == V.EMPTY) {
        for (let piece of finalPieces1) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
              c: color,
              p: piece
            })
          );
        }
        if (
          V.PawnSpecs.twoSquares &&
          x == startRank &&
          y + 2 * shiftY >= 0 &&
          y + 2 * shiftY < sizeY &&
          this.board[x + 2 * shiftX][y + 2 * shiftY] == V.EMPTY
        ) {
          // Two squares jump
          moves.push(
            this.getBasicMove([x, y], [x + 2 * shiftX, y + 2 * shiftY])
          );
        }
      }
    }
    // Capture
    const finalPieces2 =
      x + 2 * shiftX == lastRanks[0]
        ? potentialFinalPieces
        :
          x + 2 * shiftX == lastRanks[1]
            ? potentialFinalPieces.concat([V.PAWN])
            : [V.PAWN];
    if (
      this.board[x + shiftX][y] != V.EMPTY &&
      this.canTake([x, y], [x + shiftX, y]) &&
      V.OnBoard(x + 2 * shiftX, y) &&
      this.board[x + 2 * shiftX][y] == V.EMPTY
    ) {
      const oppPiece = this.getPiece(x + shiftX, y);
      for (let piece of finalPieces2) {
        let mv = this.getBasicMove(
          [x, y], [x + 2 * shiftX, y], { c: color, p: piece });
        mv.vanish.push({
          x: x + shiftX,
          y: y,
          p: oppPiece,
          c: oppCol
        });
        moves.push(mv);
      }
    }

    // En passant
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
      !!epSquare &&
      epSquare[0].x == x + shiftX &&
      epSquare[0].y == y &&
      this.board[x + 2 * shiftX][y] == V.EMPTY
    ) {
      for (let piece of finalPieces2) {
        let enpassantMove =
          this.getBasicMove(
            [x, y], [x + 2 * shiftX, y], { c: color, p: piece});
        enpassantMove.vanish.push({
          x: x,
          y: epSquare[1],
          p: "p",
          c: this.getColor(x, epSquare[1])
        });
        moves.push(enpassantMove);
      }
    }

    // Add custodian captures:
    const steps = V.steps[V.ROOK];
    moves.forEach(m => {
      // Try capturing in every direction
      for (let step of steps) {
        const sq2 = [m.end.x + 2 * step[0], m.end.y + 2 * step[1]];
        if (
          V.OnBoard(sq2[0], sq2[1]) &&
          this.board[sq2[0]][sq2[1]] != V.EMPTY &&
          this.getColor(sq2[0], sq2[1]) == color
        ) {
          // Potential capture
          const sq1 = [m.end.x + step[0], m.end.y + step[1]];
          if (
            this.board[sq1[0]][sq1[1]] != V.EMPTY &&
            this.getColor(sq1[0], sq1[1]) == oppCol
          ) {
            m.vanish.push(
              new PiPo({
                x: sq1[0],
                y: sq1[1],
                c: oppCol,
                p: this.getPiece(sq1[0], sq1[1])
              })
            );
          }
        }
      }
    });

    return moves;
  }

  getSlides([x, y], steps, options) {
    options = options || {};
    // No captures:
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      let counter = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (!options["doubleStep"] || counter % 2 == 0)
          moves.push(this.getBasicMove([x, y], [i, j]));
        if (!!options["oneStep"]) continue outerLoop;
        i += step[0];
        j += step[1];
        counter++;
      }
    }
    return moves;
  }

  // Smasher
  getPotentialRookMoves([x, y]) {
    let moves =
      this.getSlides([x, y], V.steps[V.ROOK], { doubleStep: true })
      .concat(this.getSlides([x, y], V.steps[V.BISHOP]));
    // Add captures
    const oppCol = V.GetOppCol(this.turn);
    moves.forEach(m => {
      const delta = [m.end.x - m.start.x, m.end.y - m.start.y];
      const step = [
        delta[0] / Math.abs(delta[0]) || 0,
        delta[1] / Math.abs(delta[1]) || 0
      ];
      if (step[0] == 0 || step[1] == 0) {
        // Rook-like move, candidate for capturing
        const [i, j] = [m.end.x + step[0], m.end.y + step[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol
        ) {
          m.vanish.push({
            x: i,
            y: j,
            p: this.getPiece(i, j),
            c: oppCol
          });
        }
      }
    });
    return moves;
  }

  // Leaper
  getPotentialKnightMoves([x, y]) {
    let moves =
      this.getSlides([x, y], V.steps[V.ROOK], { doubleStep: true })
      .concat(this.getSlides([x, y], V.steps[V.BISHOP]));
    const oppCol = V.GetOppCol(this.turn);
    // Look for double-knight moves (could capture):
    for (let step of V.steps[V.KNIGHT]) {
      const [i, j] = [x + 2 * step[0], y + 2 * step[1]];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        const [ii, jj] = [x + step[0], y + step[1]];
        if (this.board[ii][jj] == V.EMPTY || this.getColor(ii, jj) == oppCol) {
          let mv = this.getBasicMove([x, y], [i, j]);
          if (this.board[ii][jj] != V.EMPTY) {
            mv.vanish.push({
              x: ii,
              y: jj,
              c: oppCol,
              p: this.getPiece(ii, jj)
            });
          }
          moves.push(mv);
        }
      }
    }
    // Look for an enemy in every orthogonal direction
    for (let step of V.steps[V.ROOK]) {
      let [i, j] = [x + step[0], y+ step[1]];
      let counter = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
        counter++;
      }
      if (
        V.OnBoard(i, j) &&
        counter % 2 == 1 &&
        this.getColor(i, j) == oppCol
      ) {
        const oppPiece = this.getPiece(i, j);
        // Candidate for capture: can I land after?
        let [ii, jj] = [i + step[0], j + step[1]];
        counter++;
        while (V.OnBoard(ii, jj) && this.board[ii][jj] == V.EMPTY) {
          if (counter % 2 == 0) {
            // Same color: add capture
            let mv = this.getBasicMove([x, y], [ii, jj]);
            mv.vanish.push({
              x: i,
              y: j,
              c: oppCol,
              p: oppPiece
            });
            moves.push(mv);
          }
          ii += step[0];
          jj += step[1];
          counter++;
        }
      }
    }
    return moves;
  }

  // Remover
  getPotentialBishopMoves([x, y]) {
    let moves = this.getSlides([x, y], V.steps[V.BISHOP]);
    // Add captures
    const oppCol = V.GetOppCol(this.turn);
    let captures = [];
    for (let step of V.steps[V.ROOK]) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        captures.push([i, j]);
      }
    }
    captures.forEach(c => {
      moves.push({
        start: { x: x, y: y },
        end: { x: c[0], y: c[1] },
        appear: [],
        vanish: captures.map(ct => {
          return {
            x: ct[0],
            y: ct[1],
            c: oppCol,
            p: this.getPiece(ct[0], ct[1])
          };
        })
      });
    });
    return moves;
  }

  getPotentialKingMoves([x, y]) {
    let moves = this.getSlides([x, y], V.steps[V.BISHOP], { oneStep: true });
    // Add captures
    const oppCol = V.GetOppCol(this.turn);
    for (let step of V.steps[V.ROOK]) {
      const [i, j] = [x + 2 * step[0], y + 2 * step[1]];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        const [ii, jj] = [x + step[0], y + step[1]];
        if (this.board[ii][jj] != V.EMPTY && this.getColor(ii, jj) == oppCol) {
          let mv = this.getBasicMove([x, y], [i, j]);
          mv.vanish.push({
            x: ii,
            y: jj,
            c: oppCol,
            p: this.getPiece(ii, jj)
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPossibleMovesFrom(sq) {
    const L = this.lastMoveEnd.length;
    if (
      !!this.lastMoveEnd[L-1] &&
      (
        sq[0] != this.lastMoveEnd[L-1].x ||
        sq[1] != this.lastMoveEnd[L-1].y
      )
    ) {
      return [];
    }
    let moves = this.getPotentialMovesFrom(sq);
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  getAllValidMoves() {
    const moves = this.getAllPotentialMoves();
    const captures = V.KeepCaptures(moves);
    if (captures.length > 0) return captures;
    return moves;
  }

  filterValid(moves) {
    // No checks
    return moves;
  }

  play(move) {
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    if (move.vanish.length >= 2) {
      // Capture: update this.captured
      for (let i=1; i<move.vanish.length; i++)
        this.captured[move.vanish[i].c][move.vanish[i].p]++;
    }
    // Check if the move is the last of the turn
    if (move.vanish.length >= 2 || move.appear.length == 0) {
      const moreCaptures = (
        V.KeepCaptures(
          this.getPotentialMovesFrom([move.end.x, move.end.y])
        )
        .length > 0
      );
      move.last = !moreCaptures;
    }
    else move.last = true;
    if (!!move.last) {
      // No capture, or no more capture available
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.lastMoveEnd.push(null);
      move.last = true; //will be used in undo and computer play
    }
    else this.lastMoveEnd.push(move.end);
  }

  undo(move) {
    this.epSquares.pop();
    this.lastMoveEnd.pop();
    V.UndoOnBoard(this.board, move);
    if (move.vanish.length >= 2) {
      for (let i=1; i<move.vanish.length; i++)
        this.captured[move.vanish[i].c][move.vanish[i].p]--;
    }
    if (!!move.last) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Count kings: if one is missing, the side lost
    let kingsCount = { 'w': 0, 'b': 0 };
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getPiece(i, j) == V.KING)
          kingsCount[this.getColor(i, j)]++;
      }
    }
    if (kingsCount['w'] < 2) return "0-1";
    if (kingsCount['b'] < 2) return "1-0";
    return "*";
  }

  getComputerMove() {
    let moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    // Just play random moves (for now at least. TODO?)
    let mvArray = [];
    while (moves.length > 0) {
      const mv = moves[randInt(moves.length)];
      mvArray.push(mv);
      this.play(mv);
      if (!mv.last) {
        moves = V.KeepCaptures(
          this.getPotentialMovesFrom([mv.end.x, mv.end.y]));
      }
      else break;
    }
    for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
    return (mvArray.length > 1 ? mvArray : mvArray[0]);
  }

  getNotation(move) {
    const initialSquare = V.CoordsToSquare(move.start);
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.appear.length == 0)
      // Remover captures 'R'
      return initialSquare + "R";
    let notation = move.appear[0].p.toUpperCase() + finalSquare;
    // Add a capture mark (not describing what is captured...):
    if (move.vanish.length >= 2) notation += "X";
    return notation;
  }

};
