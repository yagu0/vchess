import { ChessRules, Move, PiPo } from "@/base_rules";

export class CoronationRules extends ChessRules {

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // If no queen on board, allow rook+bishop fusions:
    const color = this.turn;
    const piece = this.getPiece(x, y);
    if (
      [V.ROOK, V.BISHOP].includes(piece) &&
      this.board.every(b => b.every(cell =>
        (cell == V.EMPTY || cell[0] != color || cell[1] != V.QUEEN)
      ))
    ) {
      const fusionWith = [V.ROOK, V.BISHOP][1 - "rb".indexOf(piece)];
      // Can I "self-capture" fusionWith ?
      for (let step of V.steps[piece]) {
        let [i, j] = [x + step[0], y + step[1]];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == fusionWith
        ) {
          moves.push(
            new Move({
              appear: [new PiPo({ x: i, y: j, p: V.QUEEN, c: color })],
              vanish: [
                new PiPo({ x: x, y: y, p: piece, c: color }),
                new PiPo({ x: i, y: j, p: fusionWith, c: color })
              ]
            })
          );
        }
      }
    }
    return moves;
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    if (move.appear[0].p == V.QUEEN && move.vanish[0].p != V.QUEEN)
      // Coronation
      notation += "=Q";
    return notation;
  }

};
