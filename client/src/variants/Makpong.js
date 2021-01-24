import { MakrukRules } from "@/variants/Makruk";

export class MakpongRules extends MakrukRules {

  filterValid(moves) {
    const color = this.turn;
    if (!this.underCheck(color)) return super.filterValid(moves);
    // Filter out all moves involving king, except for capturing a
    // potential attacker.
    const pawnAttack = (color == 'w' ? -1 : 1);
    return super.filterValid(moves.filter(m => {
      const p = (m.vanish.length == 2 ? m.vanish[1].p : null);
      return (
        m.vanish[0].p != V.KING ||
        (
          m.vanish.length == 2 &&
          (
            (
              p == V.PAWN &&
              m.end.x - m.start.x == pawnAttack &&
              Math.abs(m.end.y - m.start.y) == 1
            )
            ||
            (
              p == V.ROOK &&
              (m.end.x == m.start.x || m.end.y == m.start.y)
            )
            ||
            (
              [V.PROMOTED, V.QUEEN].includes(p) &&
              m.end.x != m.start.x && m.end.y != m.start.y
            )
            ||
            (
              p == V.BISHOP &&
              (
                m.end.x - m.start.x == pawnAttack ||
                (
                  m.end.x - m.start.x == -pawnAttack &&
                  Math.abs(m.end.y - m.start.y) == 1
                )
              )
            )
          )
        )
      );
    }));
  }

};
