import { ChessRules } from "@/base_rules";

export class DynamoRules extends ChessRules {
  canIplay(side, [x, y]) {
    // Sometimes opponent's pieces can be moved directly
    return true;
  }

  // NOTE: to push a piece out of the board, make it slide until our piece
  // (doing the action, moving or not)
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    let moves = [];
    if (this.getColor(x, y) != color) {
      // Push or pull something: freely only if subTurn == 1
      if (this.subTurn == 2) {
        // I know that someone is pushing/pulling: find out who,
        // and deduce my possible squares (or exit).
        // TODO
      } else {
        // Look in every direction for a friendly pusher/puller.
        // This means that the action is done without moving.
        // TODO
      }
    } else {
      // My piece: fill first with normal moves (if any),
      // and add pushes/pulls (if any).
      // TODO
    }
  }

  getPPpath(m) {
    let imgName = "";
    if (m.vanish.length == 1) imgName = "empty";
    else {
      // Something is pushed or pull: count by how many squares
      if (m.appear.length == 1)
        // It just exit the board
        imgName = "raus";
      else {
        const deltaX = Math.abs(m.appear[1].x - m.vanish[1].x);
        const deltaY = Math.abs(m.appear[1].y - m.vanish[1].y);
        if (deltaX == 0) imgName = "shift" + deltaY;
        else if (deltaY == 0) imgName = "shift" + deltaX;
        else
          // Special knight push/pull: just print "P"
          imgName = "pstep";
      }
    }
    return "Dynamo/" + imgName;
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color
      ) {
        // Now step in the other direction: if end of the world, then attacked
        rx = x - step[0];
        ry = y - step[1];
        while (
          V.OnBoard(rx, ry) &&
          this.board[rx][ry] == V.EMPTY &&
          !oneStep
        ) {
          rx -= step[0];
          ry -= step[1];
        }
        if (!V.OnBoard(rx, ry)) return true;
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], color) {
    const lastRank = (color == 'w' ? 0 : 7);
    if (y != lastRank)
      // The king can be pushed out by a pawn only on last rank
      return false;
    const pawnShift = (color == "w" ? 1 : -1);
    for (let i of [-1, 1]) {
      if (
        y + i >= 0 &&
        y + i < V.size.y &&
        this.getPiece(x + pawnShift, y + i) == V.PAWN &&
        this.getColor(x + pawnShift, y + i) == color
      ) {
        return true;
      }
    }
    return false;
  }
};
