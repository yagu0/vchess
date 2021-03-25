import { Pandemonium2Rules } from "@/variants/Pandemonium2";

export class Pandemonium1Rules extends Pandemonium2Rules {

  static get PawnSpecs() {
    return Object.assign(
      { },
      Pandemonium2Rules.PawnSpecs,
      { threeSquares: true }
    );
  }

  static get size() {
    return { x: 10, y: 10};
  }

  static IsGoodEnpassant(enpassant) {
    if (enpassant != "-") {
      const squares = enpassant.split(",");
      if (squares.length > 2) return false;
      for (let sq of squares) {
        if (!sq.match(/[a-j0-9]/)) return false;
      }
    }
    return true;
  }

  static GenRandInitFen(randomness) {
    const baseFen = Pandemonium2Rules.GenRandInitFen(randomness)
    return baseFen.substr(0, 22) + "91/91/" + baseFen.substr(22);
  }

  getEnpassantFen() {
    const L = this.epSquares.length;
    if (!this.epSquares[L - 1]) return "-"; //no en-passant
    let res = "";
    this.epSquares[L - 1].forEach(sq => {
      res += V.CoordsToSquare(sq) + ",";
    });
    return res.slice(0, -1); //remove last comma
  }

  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      let res = [];
      square.split(",").forEach(sq => {
        res.push(V.SquareToCoords(sq));
      });
      return res;
    }
    // Argument is a move:
    const move = moveOrSquare;
    const [sx, sy, ex] = [move.start.x, move.start.y, move.end.x];
    if (this.getPiece(sx, sy) == V.PAWN && Math.abs(sx - ex) >= 2) {
      const step = (ex - sx) / Math.abs(ex - sx);
      let res = [{
        x: sx + step,
        y: sy
      }];
      if (sx + 2 * step != ex) {
        // 3-squares jump
        res.push({
          x: sx + 2 * step,
          y: sy
        });
      }
      return res;
    }
    return undefined; //default
  }

  applyPromotions(moves, promoted) {
    const lastRanks = (this.turn == 'w' ? [0, 1] : [V.size.x - 1, V.size.x]);
    let promotions = [];
    moves.forEach(m => {
      if (lastRanks.includes(m.start.x) || lastRanks.includes(m.end.x)) {
        let pMove = JSON.parse(JSON.stringify(m));
        pMove.appear[0].p = promoted;
        promotions.push(pMove);
      }
    });
    Array.prototype.push.apply(moves, promotions);
  }

  addPawnMoves([x1, y1], [x2, y2], moves) {
    const color = this.turn;
    const lastRanks = (color == "w" ? [0, 1] : [V.size.x - 1, V.size.x - 2]);
    if (!lastRanks.includes(x2)) {
      moves.push(this.getBasicMove([x1, y1], [x2, y2]));
      return;
    }
    let finalPieces = [V.GILDING];
    if (x2 == lastRanks[1]) finalPieces.push(V.PAWN);
    for (let piece of finalPieces) {
      const tr = (piece != V.PAWN ? { c: color, p: piece } : null);
      moves.push(this.getBasicMove([x1, y1], [x2, y2], tr));
    }
  }

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1];
    let moves = [];
    if (!!epSquare) {
      for (let epsq of epSquare) {
        // TODO: some redundant checks
        if (epsq.x == x + shiftX && Math.abs(epsq.y - y) == 1) {
          let enpassantMove = this.getBasicMove([x, y], [epsq.x, epsq.y]);
          // WARNING: the captured pawn may be diagonally behind us,
          // if it's a 3-squares jump and we take on 1st passing square
          const px = this.board[x][epsq.y] != V.EMPTY ? x : x - shiftX;
          enpassantMove.vanish.push({
            x: px,
            y: epsq.y,
            p: "p",
            c: this.getColor(px, epsq.y)
          });
          moves.push(enpassantMove);
        }
      }
    }
    return moves;
  }

};
