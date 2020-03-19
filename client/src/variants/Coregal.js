import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, sample } from "@/utils/alea";

export class CoregalRules extends ChessRules {
  static IsGoodPosition(position) {
    if (!super.IsGoodPosition(position)) return false;
    // Check that at least one queen of each color is there:
    let queens = {};
    for (let row of rows) {
      for (let i = 0; i < row.length; i++)
        if (['Q','q'].includes(row[i])) queens[row[i]] = true;
    }
    if (Object.keys(queens).length != 2) return false;
    return true;
  }

  static IsGoodFlags(flags) {
    return !!flags.match(/^[a-z]{8,8}$/);
  }

  getCheckSquares(color) {
    let squares = [];
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(this.kingPos[color], oppCol))
      squares.push(this.kingPos[color]);
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.QUEEN &&
          this.isAttacked([i, j], oppCol)
        ) {
          squares.push([i, j]);
        }
      }
    }
    return squares;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      // Castle flags here indicate pieces positions (if can castle)
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 adehadeh -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      // Get random squares for king and queen between b and g files
      let randIndex = randInt(6);
      let kingPos = randIndex + 1;
      randIndex = randInt(5);
      if (randIndex >= kingPos) randIndex++;
      let queenPos = randIndex + 1;

      // Get random squares for rooks to the left and right of the queen
      // and king: not all squares of the same colors (for bishops).
      const minQR = Math.min(kingPos, queenPos);
      const maxQR = Math.max(kingPos, queenPos);
      let rook1Pos = randInt(minQR);
      let rook2Pos = 7 - randInt(7 - maxQR);

      // Now, if we are unlucky all these 4 pieces may be on the same color.
      const rem2 = [kingPos, queenPos, rook1Pos, rook2Pos].map(pos => pos % 2);
      if (rem2.every(r => r == 0) || rem2.every(r => r == 1)) {
        // Shift a random of these pieces to the left or right
        switch (randInt(4)) {
          case 0:
            if (rook1Pos == 0) rook1Pos++;
            else rook1Pos--;
            break;
          case 1:
            if (Math.random() < 0.5) kingPos++;
            else kingPos--;
            break;
          case 2:
            if (Math.random() < 0.5) queenPos++;
            else queenPos--;
            break;
          case 3:
            if (rook2Pos == 7) rook2Pos--;
            else rook2Pos++;
            break;
        }
      }
      let bishop1Options = { 0: true, 2: true, 4: true, 6: true };
      let bishop2Options = { 1: true, 3: true, 5: true, 7: true };
      [kingPos, queenPos, rook1Pos, rook2Pos].forEach(pos => {
        if (!!bishop1Options[pos]) delete bishop1Options[pos];
        else if (!!bishop2Options[pos]) delete bishop2Options[pos];
      });
      const bishop1Pos = parseInt(sample(Object.keys(bishop1Options), 1)[0]);
      const bishop2Pos = parseInt(sample(Object.keys(bishop2Options), 1)[0]);

      // Knights' positions are now determined
      const forbidden = [
        kingPos, queenPos, rook1Pos, rook2Pos, bishop1Pos, bishop2Pos
      ];
      const [knight1Pos, knight2Pos] =
        ArrayFun.range(8).filter(pos => !forbidden.includes(pos));

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(queenPos) +
               V.CoordToColumn(kingPos) + V.CoordToColumn(rook2Pos);
    }
    // Add turn + flags + enpassant
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " -"
    );
  }

  setFlags(fenflags) {
    // white a-castle, h-castle, black a-castle, h-castle
    this.castleFlags = { w: [...Array(4)], b: [...Array(4)] };
    for (let i = 0; i < 8; i++) {
      this.castleFlags[i < 4 ? "w" : "b"][i % 4] =
        V.ColumnToCoord(fenflags.charAt(i));
    }
  }

  getPotentialQueenMoves(sq) {
    return super.getPotentialQueenMoves(sq).concat(this.getCastleMoves(sq));
  }

  getCastleMoves([x, y], castleInCheck) {
    return [];
//    const c = this.getColor(x, y);
//    if (x != (c == "w" ? V.size.x - 1 : 0) || y != this.INIT_COL_KING[c])
//      return []; //x isn't first rank, or king has moved (shortcut)
//
//    // Castling ?
//    const oppCol = V.GetOppCol(c);
//    let moves = [];
//    let i = 0;
//    // King, then rook:
//    const finalSquares = [
//      [2, 3],
//      [V.size.y - 2, V.size.y - 3]
//    ];
//    castlingCheck: for (
//      let castleSide = 0;
//      castleSide < 2;
//      castleSide++ //large, then small
//    ) {
//      if (this.castleFlags[c][castleSide] >= V.size.y) continue;
//      // If this code is reached, rooks and king are on initial position
//
//      // NOTE: in some variants this is not a rook, but let's keep variable name
//      const rookPos = this.castleFlags[c][castleSide];
//      const castlingPiece = this.getPiece(x, rookPos);
//      if (this.getColor(x, rookPos) != c)
//        // Rook is here but changed color (see Benedict)
//        continue;
//
//      // Nothing on the path of the king ? (and no checks)
//      const finDist = finalSquares[castleSide][0] - y;
//      let step = finDist / Math.max(1, Math.abs(finDist));
//      i = y;
//      do {
//        if (
//          (!castleInCheck && this.isAttacked([x, i], oppCol)) ||
//          (this.board[x][i] != V.EMPTY &&
//            // NOTE: next check is enough, because of chessboard constraints
//            (this.getColor(x, i) != c ||
//              ![V.KING, castlingPiece].includes(this.getPiece(x, i))))
//        ) {
//          continue castlingCheck;
//        }
//        i += step;
//      } while (i != finalSquares[castleSide][0]);
//
//      // Nothing on the path to the rook?
//      step = castleSide == 0 ? -1 : 1;
//      for (i = y + step; i != rookPos; i += step) {
//        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
//      }
//
//      // Nothing on final squares, except maybe king and castling rook?
//      for (i = 0; i < 2; i++) {
//        if (
//          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
//          this.getPiece(x, finalSquares[castleSide][i]) != V.KING &&
//          finalSquares[castleSide][i] != rookPos
//        ) {
//          continue castlingCheck;
//        }
//      }
//
//      // If this code is reached, castle is valid
//      moves.push(
//        new Move({
//          appear: [
//            new PiPo({ x: x, y: finalSquares[castleSide][0], p: V.KING, c: c }),
//            new PiPo({ x: x, y: finalSquares[castleSide][1], p: castlingPiece, c: c })
//          ],
//          vanish: [
//            new PiPo({ x: x, y: y, p: V.KING, c: c }),
//            new PiPo({ x: x, y: rookPos, p: castlingPiece, c: c })
//          ],
//          end:
//            Math.abs(y - rookPos) <= 2
//              ? { x: x, y: rookPos }
//              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
//        })
//      );
//    }
//
//    return moves;
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(this.kingPos[color], oppCol)) return true;
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.QUEEN &&
          this.isAttacked([i, j], oppCol)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  updateCastleFlags(move, piece) {
//    const c = V.GetOppCol(this.turn);
//    const firstRank = (c == "w" ? V.size.x - 1 : 0);
//    // Update castling flags if rooks are moved
//    const oppCol = V.GetOppCol(c);
//    const oppFirstRank = V.size.x - 1 - firstRank;
//    if (piece == V.KING && move.appear.length > 0)
//      this.castleFlags[c] = [V.size.y, V.size.y];
//    else if (
//      move.start.x == firstRank && //our rook moves?
//      this.castleFlags[c].includes(move.start.y)
//    ) {
//      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
//      this.castleFlags[c][flagIdx] = V.size.y;
//    } else if (
//      move.end.x == oppFirstRank && //we took opponent rook?
//      this.castleFlags[oppCol].includes(move.end.y)
//    ) {
//      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
//      this.castleFlags[oppCol][flagIdx] = V.size.y;
//    }
  }

  // NOTE: do not set queen value to 1000 or so, because there may be several.
};
