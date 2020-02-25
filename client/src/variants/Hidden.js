import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class HiddenRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  // Analyse in Hidden mode makes no sense
  static get CanAnalyze() {
    return false;
  }

  // Moves are revealed only when game ends
  static get ShowMoves() {
    return "none";
  }

  static get HIDDEN_DECODE() {
    return {
      s: "p",
      t: "q",
      u: "r",
      c: "b",
      o: "n",
      l: "k"
    };
  }
  static get HIDDEN_CODE() {
    return {
      p: "s",
      q: "t",
      r: "u",
      b: "c",
      n: "o",
      k: "l"
    };
  }

  // Turn a hidden piece or revealed piece into revealed piece:
  static Decode(p) {
    if (Object.keys(V.HIDDEN_DECODE).includes(p))
      return V.HIDDEN_DECODE[p];
    return p;
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(Object.values(V.HIDDEN_CODE));
  }

  // Pieces can be hidden :)
  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    if (Object.keys(V.HIDDEN_DECODE).includes(piece))
      return V.HIDDEN_DECODE[piece];
    return piece;
  }

  // Scan board for kings positions (no castling)
  scanKingsRooks(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
          case "l":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
          case "L":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  getPpath(b, color, score) {
    if (Object.keys(V.HIDDEN_DECODE).includes(b[1])) {
      // Supposed to be hidden.
      if (score == "*" && (!color || color != b[0]))
        return "Hidden/" + b[0] + "p";
      // Else: condition OK to show the piece
      return b[0] + V.HIDDEN_DECODE[b[1]];
    }
    // The piece is already not supposed to be hidden:
    return b;
  }

  getBasicMove([sx, sy], [ex, ey], tr) {
    if (
      tr &&
      Object.keys(V.HIDDEN_DECODE).includes(this.board[sx][sy].charAt(1))
    ) {
      // The transformed piece is a priori hidden
      tr.p = V.HIDDEN_CODE[tr.p];
    }
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : this.getColor(sx, sy),
          p: tr ? tr.p : this.board[sx][sy].charAt(1)
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: this.getColor(sx, sy),
          p: this.board[sx][sy].charAt(1)
        })
      ]
    });

    // The opponent piece disappears if we take it
    if (this.board[ex][ey] != V.EMPTY) {
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.board[ex][ey].charAt(1)
        })
      );
      // Pieces are revealed when they capture
      mv.appear[0].p = V.Decode(mv.appear[0].p);
    }

    return mv;
  }

  // What are the king moves from square x,y ?
  getPotentialKingMoves(sq) {
    // No castling:
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  filterValid(moves) {
    return moves;
  }

  static GenRandInitFen() {
    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces + pawns on two first ranks
    for (let c of ["w", "b"]) {
      let positions = ArrayFun.range(16);

      // Get random squares for bishops
      let randIndex = 2 * randInt(8);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(8) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(14);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(13);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random squares for rooks
      randIndex = randInt(12);
      const rook1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(11);
      const rook2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(10);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for king
      randIndex = randInt(9);
      const kingPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Pawns position are all remaining slots:
      for (let p of positions)
        pieces[c][p] = "s";

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "u";
      pieces[c][knight1Pos] = "o";
      pieces[c][bishop1Pos] = "c";
      pieces[c][queenPos] = "t";
      pieces[c][kingPos] = "l";
      pieces[c][bishop2Pos] = "c";
      pieces[c][knight2Pos] = "o";
      pieces[c][rook2Pos] = "u";
    }
    let upFen = pieces["b"].join("");
    upFen = upFen.substr(0,8) + "/" + upFen.substr(8).split("").reverse().join("");
    let downFen = pieces["b"].join("").toUpperCase();
    downFen = downFen.substr(0,8) + "/" + downFen.substr(8).split("").reverse().join("");
    return upFen + "/8/8/8/8/" + downFen + " w 0";
  }

  getCheckSquares() {
    return [];
  }

  updateVariables(move) {
    super.updateVariables(move);
    if (
      move.vanish.length >= 2 &&
      [V.KING,V.HIDDEN_CODE[V.KING]].includes(move.vanish[1].p)
    ) {
      // We took opponent king
      this.kingPos[this.turn] = [-1, -1];
    }
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    const c = move.vanish[0].c;
    const oppCol = V.GetOppCol(c);
    if (this.kingPos[oppCol][0] < 0)
      // Last move took opponent's king:
      this.kingPos[oppCol] = [move.vanish[1].x, move.vanish[1].y];
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    // Assume that stalemate is impossible:
    return "*";
  }

  getComputerMove() {
    const color = this.turn;
    let moves = this.getAllValidMoves();
    for (let move of moves) {
      move.eval = 0; //a priori...

      // Can I take something ? If yes, do it with some probability
      if (move.vanish.length == 2 && move.vanish[1].c != color) {
        // OK this isn't a castling move
        const myPieceVal = V.VALUES[move.appear[0].p];
        const hisPieceVal = Object.keys(V.HIDDEN_DECODE).includes(move.vanish[1].p)
          ? undefined
          : V.VALUES[move.vanish[1].p];
        if (!hisPieceVal) {
          // Opponent's piece is unknown: do not take too much risk
          move.eval = -myPieceVal + 1.5; //so that pawns always take
        }
        // Favor captures
        else if (myPieceVal <= hisPieceVal)
          move.eval = hisPieceVal - myPieceVal + 1;
        else {
          // Taking a pawn with minor piece,
          // or minor piece or pawn with a rook,
          // or anything but a queen with a queen,
          // or anything with a king.
          move.eval = hisPieceVal - myPieceVal;
        }
      } else {
        // If no capture, favor small step moves,
        // but sometimes move the knight anyway
        const penalty = V.Decode(move.vanish[0].p) != V.KNIGHT
          ? Math.abs(move.end.x - move.start.x) + Math.abs(move.end.y - move.start.y)
          : (Math.random() < 0.5 ? 3 : 1);
        move.eval -= penalty / (V.size.x + V.size.y - 1);
      }

      // TODO: also favor movements toward the center?
    }

    moves.sort((a, b) => b.eval - a.eval);
    let candidates = [0];
    for (let j = 1; j < moves.length && moves[j].eval == moves[0].eval; j++)
      candidates.push(j);
    return moves[candidates[randInt(candidates.length)]];
  }

  getNotation(move) {
    // Translate final square
    const finalSquare = V.CoordsToSquare(move.end);

    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      let notation = "";
      if (move.vanish.length > move.appear.length) {
        // Capture
        const startColumn = V.CoordToColumn(move.start.y);
        notation = startColumn + "x" + finalSquare;
      }
      else notation = finalSquare;
      if (move.appear.length > 0 && !["p","s"].includes(move.appear[0].p)) {
        // Promotion
        const appearPiece = V.Decode(move.appear[0].p);
        notation += "=" + appearPiece.toUpperCase();
      }
      return notation;
    }
    // Piece movement
    return (
      piece.toUpperCase() +
      (move.vanish.length > move.appear.length ? "x" : "") +
      finalSquare
    );
  }
};
