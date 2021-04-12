import { Move, PiPo } from "@/base_rules";
import { Stealthbomb1Rules } from "@/variants/Stealthbomb1";

export class Stealthbomb2Rules extends Stealthbomb1Rules {

  // Initiate the game by choosing a pawn holding the bomb:
  doClick(square) {
    const c = this.turn;
    if (
      this.movesCount >= 2 ||
      (
        (c == 'w' && square[0] != 6) ||
        (c == 'b' && square[0] != 1)
      )
    ) {
      return null;
    }
    const [x, y] = square;
    return new Move({
      appear: [ new PiPo({ x: x, y: y, c: c, p: 's' }) ],
      vanish: [ new PiPo({ x: x, y: y, c: c, p: 'p' }) ],
      start: { x: -1, y: -1 },
      end: { x: x, y: y, noHighlight: true }
    });
  }

};
