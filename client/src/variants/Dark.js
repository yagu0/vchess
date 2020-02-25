import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class DarkRules extends ChessRules {
  // Analyse in Dark mode makes no sense
  static get CanAnalyze() {
    return false;
  }

  // Moves are revealed only when game ends
  static get ShowMoves() {
    return "none";
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    this.enlightened = {
      w: ArrayFun.init(sizeX, sizeY),
      b: ArrayFun.init(sizeX, sizeY)
    };
    // Setup enlightened: squares reachable by each side
    // (TODO: one side would be enough ?)
    this.updateEnlightened();
  }

  updateEnlightened() {
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        this.enlightened["w"][i][j] = false;
        this.enlightened["b"][i][j] = false;
      }
    }
    const pawnShift = { w: -1, b: 1 };
    // Initialize with pieces positions (which are seen)
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const color = this.getColor(i, j);
          this.enlightened[color][i][j] = true;
          // Add potential squares visible by "impossible pawn capture"
          if (this.getPiece(i, j) == V.PAWN) {
            for (let shiftY of [-1, 1]) {
              if (
                V.OnBoard(i + pawnShift[color], j + shiftY) &&
                this.board[i + pawnShift[color]][j + shiftY] == V.EMPTY
              ) {
                this.enlightened[color][i + pawnShift[color]][j + shiftY] = true;
              }
            }
          }
        }
      }
    }
    const currentTurn = this.turn;
    this.turn = "w";
    const movesWhite = this.getAllValidMoves();
    this.turn = "b";
    const movesBlack = this.getAllValidMoves();
    this.turn = currentTurn;
    for (let move of movesWhite)
      this.enlightened["w"][move.end.x][move.end.y] = true;
    for (let move of movesBlack)
      this.enlightened["b"][move.end.x][move.end.y] = true;
  }

  // Has to be redefined to avoid an infinite loop
  getAllValidMoves() {
    const color = this.turn;
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color)
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
      }
    }
    return potentialMoves; //because there are no checks
  }

  getCheckSquares() {
    return [];
  }

  updateVariables(move) {
    super.updateVariables(move);
    if (move.vanish.length >= 2 && move.vanish[1].p == V.KING)
      // We took opponent king (because if castle vanish[1] is a rook)
      this.kingPos[this.turn] = [-1, -1];

    // Update lights for both colors:
    this.updateEnlightened();
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    const c = move.vanish[0].c;
    const oppCol = V.GetOppCol(c);
    if (this.kingPos[oppCol][0] < 0)
      // Last move took opponent's king:
      this.kingPos[oppCol] = [move.vanish[1].x, move.vanish[1].y];

    // Update lights for both colors:
    this.updateEnlightened();
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    // Assume that stalemate is impossible (I think so. Would need proof...)
    return "*";
  }

  static get THRESHOLD_MATE() {
    return 500; //checkmates evals may be slightly below 1000
  }

  // In this special situation, we just look 1 half move ahead
  getComputerMove() {
    const maxeval = V.INFINITY;
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const pawnShift = color == "w" ? -1 : 1;

    // Do not cheat: the current enlightment is all we can see
    const myLight = JSON.parse(JSON.stringify(this.enlightened[color]));

    // Can a slider on (i,j) apparently take my king?
    // NOTE: inaccurate because assume yes if some squares are shadowed
    const sliderTake = ([i, j], piece) => {
      const kp = this.kingPos[color];
      let step = undefined;
      if (piece == V.BISHOP) {
        if (Math.abs(kp[0] - i) == Math.abs(kp[1] - j)) {
          step = [
            (i - kp[0]) / Math.abs(i - kp[0]),
            (j - kp[1]) / Math.abs(j - kp[1])
          ];
        }
      } else if (piece == V.ROOK) {
        if (kp[0] == i) step = [0, (j - kp[1]) / Math.abs(j - kp[1])];
        else if (kp[1] == j) step = [(i - kp[0]) / Math.abs(i - kp[0]), 0];
      }
      if (!step) return false;
      // Check for obstacles
      let obstacle = false;
      for (
        let x = kp[0] + step[0], y = kp[1] + step[1];
        x != i && y != j;
        x += step[0], y += step[1]
      ) {
        if (myLight[x][y] && this.board[x][y] != V.EMPTY) {
          obstacle = true;
          break;
        }
      }
      if (!obstacle) return true;
      return false;
    };

    // Do I see something which can take my king ?
    const kingThreats = () => {
      const kp = this.kingPos[color];
      for (let i = 0; i < V.size.x; i++) {
        for (let j = 0; j < V.size.y; j++) {
          if (
            myLight[i][j] &&
            this.board[i][j] != V.EMPTY &&
            this.getColor(i, j) != color
          ) {
            switch (this.getPiece(i, j)) {
              case V.PAWN:
                if (kp[0] + pawnShift == i && Math.abs(kp[1] - j) == 1)
                  return true;
                break;
              case V.KNIGHT:
                if (
                  (Math.abs(kp[0] - i) == 2 && Math.abs(kp[1] - j) == 1) ||
                  (Math.abs(kp[0] - i) == 1 && Math.abs(kp[1] - j) == 2)
                ) {
                  return true;
                }
                break;
              case V.KING:
                if (Math.abs(kp[0] - i) == 1 && Math.abs(kp[1] - j) == 1)
                  return true;
                break;
              case V.BISHOP:
                if (sliderTake([i, j], V.BISHOP)) return true;
                break;
              case V.ROOK:
                if (sliderTake([i, j], V.ROOK)) return true;
                break;
              case V.QUEEN:
                if (sliderTake([i, j], V.BISHOP) || sliderTake([i, j], V.ROOK))
                  return true;
                break;
            }
          }
        }
      }
      return false;
    };

    let moves = this.getAllValidMoves();
    for (let move of moves) {
      this.play(move);
      if (this.kingPos[oppCol][0] >= 0 && kingThreats()) {
        // We didn't take opponent king, and our king will be captured: bad
        move.eval = -maxeval;
      }
      this.undo(move);

      if (move.eval) continue;

      move.eval = 0; //a priori...

      // Can I take something ? If yes, do it if it seems good...
      if (move.vanish.length == 2 && move.vanish[1].c != color) {
        // OK this isn't a castling move
        const myPieceVal = V.VALUES[move.appear[0].p];
        const hisPieceVal = V.VALUES[move.vanish[1].p];
        // Favor captures
        if (myPieceVal <= hisPieceVal) move.eval = hisPieceVal - myPieceVal + 1;
        else {
          // Taking a pawn with minor piece,
          // or minor piece or pawn with a rook,
          // or anything but a queen with a queen,
          // or anything with a king.
          move.eval = hisPieceVal - myPieceVal;
                      //Math.random() < 0.5 ? 1 : -1;
        }
      }
    }

    // TODO: also need to implement the case when an opponent piece (in light)
    // is threatening something - maybe not the king, but e.g. pawn takes rook.

    moves.sort((a, b) => b.eval - a.eval);
    let candidates = [0];
    for (let j = 1; j < moves.length && moves[j].eval == moves[0].eval; j++)
      candidates.push(j);
    return moves[candidates[randInt(candidates.length)]];
  }
};
