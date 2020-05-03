import { ChessRules, Move } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class DiceRules extends ChessRules {
  static get CanAnalyze() {
    return true;//false;
  }

  doClick(square) {
    if (
      this.subTurn == 2 ||
      isNaN(square[0]) ||
      this.board[square[0]][square[1]] != V.EMPTY
    ) {
      return null;
    }
    // Announce the piece' type to be played:
    return this.getRandPieceMove();
  }

  getPotentialMovesFrom([x, y]) {
    const L = this.p2play.length;
    if (
      this.subTurn == 1 ||
      // The piece type must match last p2play
      this.getPiece(x, y) != this.p2play[L-1]
    ) {
      return [];
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.p2play = [];
    this.subTurn = 1;
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
    if (this.subTurn == 1) {
      this.subTurn = 2;
      this.p2play.push(move.appear[0].p);
      return;
    }
    // Subturn == 2 means the (dice-constrained) move is played
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    this.epSquares.push(this.getEpSquare(move));
    this.movesCount++;
    this.turn = V.GetOppCol(this.turn);
    this.subTurn = 1;
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [-1, -1];
    // Castle flags for captured king won't be updated (not important...)
    super.postPlay(move);
  }

  undo(move) {
    if (this.subTurn == 2) {
      this.subTurn = 1;
      this.p2play.pop();
      return;
    }
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    this.epSquares.pop();
    this.movesCount--;
    this.turn = V.GetOppCol(this.turn);
    this.subTurn = 2;
    this.postUndo(move);
  }

  postUndo(move) {
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
    super.postUndo(move);
  }

  getRandPieceMove() {
    // For current turn, find pieces which can move and roll a dice
    let canMove = {};
    const color = this.turn;
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          const piece = this.getPiece(i, j);
          if (
            !canMove[piece] &&
            super.getPotentialMovesFrom([i, j]).length > 0
          ) {
            canMove[piece] = [i, j];
          }
        }
      }
    }
    const options = Object.keys(canMove);
    const randPiece = options[randInt(options.length)];
    return (
      new Move({
        appear: [{ p: randPiece }],
        vanish: [],
        start: { x: -1, y: -1 },
        end: { x: canMove[randPiece][0], y: canMove[randPiece][1] }
      })
    );
  }

  // Random mover
  getComputerMove() {
    const toPlay = this.getRandPieceMove();
    this.play(toPlay);
    const moves = this.getAllValidMoves();
    const choice = moves[randInt(moves.length)];
    this.undo(toPlay);
    return [toPlay, choice];
  }

  getNotation(move) {
    if (this.subTurn == 1) return move.appear[0].p.toUpperCase();
    return super.getNotation(move);
  }
};
