import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class Antiking1Rules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  static get HasCastle() {
    return false;
  }

  static get ANTIKING() {
    return "a";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.ANTIKING]);
  }

  getPpath(b) {
    return b[1] == "a" ? "Antiking/" + b : b;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.antikingPos = { w: [-1, -1], b: [-1, -1] };
    const rows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < rows.length; i++) {
      let k = 0;
      for (let j = 0; j < rows[i].length; j++) {
        switch (rows[i].charAt(j)) {
          case "a":
            this.antikingPos["b"] = [i, k];
            break;
          case "A":
            this.antikingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(rows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  // (Anti)King flags at 1 (true) if they can knight-jump
  setFlags(fenflags) {
    this.kingFlags = {
      // King then antiking
      w: [...Array(2).fill(false)],
      b: [...Array(2).fill(false)]
    };
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 2; i++)
        this.kingFlags[c][i] = fenflags.charAt((c == "w" ? 0 : 2) + i) == "1";
    }
  }

  aggregateFlags() {
    return this.kingFlags;
  }

  disaggregateFlags(flags) {
    this.kingFlags = flags;
  }

  getFlagsFen() {
    // Return kings flags
    let flags = "";
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 2; i++) flags += this.kingFlags[c][i] ? "1" : "0";
    }
    return flags;
  }

  canTake([x1, y1], [x2, y2]) {
    const piece1 = this.getPiece(x1, y1);
    const piece2 = this.getPiece(x2, y2);
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    return (
      piece2 != "a" &&
      ((piece1 != "a" && color1 != color2) ||
        (piece1 == "a" && color1 == color2))
    );
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    let addKnightJumps = false;
    const piece = this.getPiece(x, y);
    const color = this.getColor(x, y);
    if (piece == V.ANTIKING) {
      moves = this.getPotentialAntikingMoves([x, y]);
      addKnightJumps = this.kingFlags[color][1];
    } else {
      moves = super.getPotentialMovesFrom([x, y]);
      if (piece == V.KING) addKnightJumps = this.kingFlags[color][0];
    }
    if (addKnightJumps) {
      // Add potential knight jump to (anti)kings
      const knightJumps = super.getPotentialKnightMoves([x, y]);
      // Remove captures (TODO: could be done more efficiently...)
      moves = moves.concat(knightJumps.filter(m => m.vanish.length == 1));
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;
    const finalPieces =
      x + shiftX == lastRank ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN] : [V.PAWN];

    // One square diagonally
    for (let shiftY of [-1, 1]) {
      if (this.board[x + shiftX][y + shiftY] == V.EMPTY) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
              c: color,
              p: piece
            })
          );
        }
      }
    }
    // Capture
    if (
      this.board[x + shiftX][y] != V.EMPTY &&
      this.canTake([x, y], [x + shiftX, y])
    ) {
      for (let piece of finalPieces)
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], { c: color, p: piece })
        );
    }

    return moves;
  }

  getPotentialAntikingMoves(sq) {
    // The antiking moves like a king (only captured colors differ)
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByAntiking(sq, color)
    );
  }

  isAttackedByPawn([x, y], color) {
    let pawnShift = (color == "w" ? 1 : -1);
    if (x + pawnShift >= 0 && x + pawnShift < V.size.x) {
      if (
        this.getPiece(x + pawnShift, y) == V.PAWN &&
        this.getColor(x + pawnShift, y) == color
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByKing([x, y], color) {
    // Antiking is not attacked by king:
    if (this.getPiece(x, y) == V.ANTIKING) return false;
    return this.isAttackedBySlideNJump(
      [x, y],
      color,
      V.KING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttackedByAntiking([x, y], color) {
    // (Anti)King is not attacked by antiking
    if ([V.KING, V.ANTIKING].includes(this.getPiece(x, y))) return false;
    return this.isAttackedBySlideNJump(
      [x, y],
      color,
      V.ANTIKING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    let res =
      this.isAttacked(this.kingPos[color], oppCol) ||
      !this.isAttacked(this.antikingPos[color], oppCol);
    return res;
  }

  getCheckSquares(color) {
    let res = [];
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(this.kingPos[color], oppCol))
      res.push(JSON.parse(JSON.stringify(this.kingPos[color])));
    if (!this.isAttacked(this.antikingPos[color], oppCol))
      res.push(JSON.parse(JSON.stringify(this.antikingPos[color])));
    return res;
  }

  postPlay(move) {
    super.postPlay(move);
    const piece = move.vanish[0].p;
    const c = move.vanish[0].c;
    // Update antiking position, and kings flags
    if (piece == V.ANTIKING) {
      this.antikingPos[c][0] = move.appear[0].x;
      this.antikingPos[c][1] = move.appear[0].y;
      this.kingFlags[c][1] = false;
    } else if (piece == V.KING) this.kingFlags[c][0] = false;
  }

  postUndo(move) {
    super.postUndo(move);
    const c = move.vanish[0].c;
    if (move.vanish[0].p == V.ANTIKING)
      this.antikingPos[c] = [move.start.x, move.start.y];
  }

  getCurrentScore() {
    if (this.atLeastOneMove())
      return "*";

    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    if (
      !this.isAttacked(this.kingPos[color], oppCol) &&
      this.isAttacked(this.antikingPos[color], oppCol)
    ) {
      return "1/2";
    }
    return color == "w" ? "0-1" : "1-0";
  }

  static get VALUES() {
    return Object.assign(
      { a: 1000 },
      ChessRules.VALUES
    );
  }

  static GenRandInitFen() {
    // Always deterministic setup
    return "2prbkqA/2p1nnbr/2pppppp/8/8/PPPPPP2/RBNN1P2/aQKBRP2 w 0 1111";
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  // TODO: notation copied from Berolina
  getNotation(move) {
    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      const finalSquare = V.CoordsToSquare(move.end);
      let notation = "";
      if (move.vanish.length == 2)
        //capture
        notation = "Px" + finalSquare;
      else {
        // No capture: indicate the initial square for potential ambiguity
        const startSquare = V.CoordsToSquare(move.start);
        notation = startSquare + finalSquare;
      }
      if (move.appear[0].p != V.PAWN)
        // Promotion
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    return super.getNotation(move); //all other pieces are orthodox
  }
};
