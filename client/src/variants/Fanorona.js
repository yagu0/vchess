import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class FanoronaRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  static get Lines() {
    let lines = [];
    // Draw all inter-squares lines, shifted:
    for (let i = 0; i < V.size.x; i++)
      lines.push([[i+0.5, 0.5], [i+0.5, V.size.y-0.5]]);
    for (let j = 0; j < V.size.y; j++)
      lines.push([[0.5, j+0.5], [V.size.x-0.5, j+0.5]]);
    const columnDiags = [
      [[0.5, 0.5], [2.5, 2.5]],
      [[0.5, 2.5], [2.5, 0.5]],
      [[2.5, 0.5], [4.5, 2.5]],
      [[4.5, 0.5], [2.5, 2.5]]
    ];
    for (let j of [0, 2, 4, 6]) {
      lines = lines.concat(
        columnDiags.map(L => [[L[0][0], L[0][1] + j], [L[1][0], L[1][1] + j]])
      );
    }
    return lines;
  }

  static get Notoodark() {
    return true;
  }

  static GenRandInitFen() {
    return "ppppppppp/ppppppppp/pPpP1pPpP/PPPPPPPPP/PPPPPPPPP w 0";
  }

  setOtherVariables(fen) {
    // Local stack of captures during a turn (squares + directions)
    this.captures = [];
  }

  static get size() {
    return { x: 5, y: 9 };
  }

  static get PIECES() {
    return [V.PAWN];
  }

  getPiece() {
    return V.PAWN;
  }

  getPpath(b) {
    return "Fanorona/" + b;
  }

  //TODO
  //getPPpath() {}

  getPotentialMovesFrom([x, y]) {
    // NOTE: (x + y) % 2 == 0 ==> has diagonals
    // TODO
    // Même stratégie que Yote, revenir sur ses pas si stop avant de tout capturer
    // Mais première capture obligatoire (si this.captures.length == 0).
    // After a capture: allow only capturing.
    // Warning: case 3 on Wikipedia page, if both percussion & aspiration,
    // two different moves, cannot take all ==> adjust getPPpath showing arrows.
    // nice looking arrows, with something representing a capture at its end...
    return [];
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  //TODO: function aux to detect if continuation captures
  //(not trivial, but not difficult)

  play(move) {
    const color = this.turn;
    move.turn = color; //for undo
    const captureNotEnding = (
      move.vanish.length >= 2 &&
      true //TODO: detect if there are continuation captures
    );
    this.captures.push(captureNotEnding); //TODO: something more structured
                                          //with square + direction of capture
    if (captureNotEnding) move.notTheEnd = true;
    else {
      this.turn = oppCol;
      this.movesCount++;
    }
    this.postPlay(move);
  }

  undo(move) {
    V.UndoOnBoard(this.board, move);
    this.captures.pop();
    if (move.turn != this.turn) {
      this.turn = move.turn;
      this.movesCount--;
    }
    this.postUndo(move);
  }

  getCurrentScore() {
    const color = this.turn;
    // If no stones on board, I lose
    if (
      this.board.every(b => {
        return b.every(cell => {
          return (cell == "" || cell[0] != color);
        });
      })
    ) {
      return (color == 'w' ? "0-1" : "1-0");
    }
    return "*";
  }

  getComputerMove() {
    const moves = super.getAllValidMoves();
    if (moves.length == 0) return null;
    const color = this.turn;
    // Capture available? If yes, play it
    let captures = moves.filter(m => m.vanish.length >= 2);
    let mvArray = [];
    while (captures.length >= 1) {
      // Then just pick random captures (trying to maximize)
      let candidates = captures.filter(c => !!c.notTheEnd);
      let mv = null;
      if (candidates.length >= 1) mv = candidates[randInt(candidates.length)];
      else mv = captures[randInt(captures.length)];
      this.play(mv);
      captures = (this.turn == color ? super.getAllValidMoves() : []);
    }
    if (mvArray.length >= 1) {
      for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
      return mvArray;
    }
    // Just play a random move, which if possible do not let a capture
    let candidates = [];
    for (let m of moves) {
      this.play(m);
      const moves2 = super.getAllValidMoves();
      if (moves2.every(m2 => m2.vanish.length <= 1))
        candidates.push(m);
      this.undo(m);
    }
    if (candidates.length >= 1) return candidates[randInt(candidates.length)];
    return moves[randInt(moves.length)];
  }

  getNotation(move) {
    return (
      V.CoordsToSquare(move.start) +
      (move.vanish.length >= 2 ? "x" : "") +
      V.CoordsToSquare(move.end)
    );
  }

};
