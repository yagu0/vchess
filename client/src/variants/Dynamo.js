import { ChessRules, Move, PiPo } from "@/base_rules";

// TODO: need FEN lastmove pour interdire défaire dernière poussée
// --> check appear et vanish totally reversed.

// TODO: pawn promotions by push (en + des promotions standard)
// --> similar to Zen promotions.

export class DynamoRules extends ChessRules {
  canIplay(side, [x, y]) {
    // Sometimes opponent's pieces can be moved directly
    return true;
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
        if (deltaX == 0) imgName = "shift_" + deltaY;
        else if (deltaY == 0) imgName = "shift_" + deltaX;
        else
          // Special knight push/pull: just print "P"
          imgName = "pstep";
      }
    }
    return "Dynamo/" + imgName;
  }

  getPactions(sq, by, color) {
    const [x, y] = sq;
    let moves = [];
    let squares = {};
//    const lineAdd = (allowedPieces) = {
//      // attacking piece must be of the allowed types
//    };
    if (!by) {
      // Look in all directions for a "color" piece
      for (let step of V.steps[V.KNIGHT]) {
        const xx = x + step[0],
              yy = y + step[1];
        if (
          V.OnBoard(xx, yy) &&
          this.getPiece(xx, yy) == V.KNIGHT &&
          this.getColor(xx, yy) == color
        ) {
          const px = x - step[0],
                py = y - step[1];
          if (V.OnBoard(px, py) && this.board[px][py] == V.EMPTY) {
            const hash = "s" + px + py;
            if (!squares[hash]) {
              squares[hash] = true;
              moves.push(this.getBasicMove([x, y], [px, py]));
            }
          } else {
            const hash = "s" + xx + yy;
            if (!squares[hash]) {
              squares[hash] = true;
              moves.push(
                new Move({
                  start: { x: x, y: y },
                  end: { x: xx, y: yy },
                  appear: [],
                  vanish: [
                    new PiPo({
                      x: x,
                      y: y,
                      p: this.getPiece(x, y),
                      c: oppCol
                    })
                  ]
                })
              );
            }
          }
        }
      }
      for (let step in V.steps[V.ROOK]) {
        // color is enemy, so no pawn pushes: king, rook and queen
      }
      for (let step in V.steps[V.BISHOP]) {
        // King, bishop, queen, and possibly pawns attacks
      }
    }
//    else {
//      // TODO: probably in a different function for now.
//    }
    return moves;
  }

  // NOTE: to push a piece out of the board, make it slide until our piece
  // (doing the action, moving or not)
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    if (this.getColor(x, y) != color) {
      // Look in every direction for a friendly pusher/puller.
      // This means that the action is done without moving.
      return this.getPactions([x, y], null, color);
    } else {
      // Playing my pieces: do they attack an enemy?
      // If yes ... TODO
      //this.getPattacks(sq, [x, y]);
      // Temporary:
      return super.getPotentialMovesFrom([x, y]);
    }
    return []; //never reached
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
