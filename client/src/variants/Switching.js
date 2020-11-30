import { ChessRules, Move, PiPo } from "@/base_rules";

export class SwitchingRules extends ChessRules {

  // Build switch move between squares x1,y1 and x2,y2
	getSwitchMove_s([x1, y1], [x2, y2]) {
		const c = this.getColor(x1, y1); //same as color at square 2
		const p1 = this.getPiece(x1, y1);
		const p2 = this.getPiece(x2, y2);
		let move = new Move({
			appear: [
				new PiPo({ x: x2, y: y2, c: c, p: p1 }),
				new PiPo({ x: x1, y: y1, c: c, p: p2 })
			],
			vanish: [
				new PiPo({ x: x1, y: y1, c: c, p: p1 }),
				new PiPo({ x: x2, y: y2, c: c, p: p2 })
			]
		});
		// Move completion: promote switched pawns (as in Magnetic)
		const lastRank = (c == "w" ? 0 : V.size.x - 1);
		let moves = [];
		if ((p1 == V.PAWN && x2 == lastRank) || (p2 == V.PAWN && x1 == lastRank)) {
			const idx = (p1 == V.PAWN ? 0 : 1);
			move.appear[idx].p = V.ROOK;
			moves.push(move);
			for (let piece of [V.KNIGHT, V.BISHOP, V.QUEEN]) {
				let cmove = JSON.parse(JSON.stringify(move));
				cmove.appear[idx].p = piece;
				moves.push(cmove);
			}
			if (idx == 1) {
				// Swap moves[i].appear[0] and [1] for moves presentation [TODO...]
				moves.forEach(m => {
					let tmp = m.appear[0];
					m.appear[0] = m.appear[1];
					m.appear[1] = tmp;
				});
			}
		}
		else
      // Other cases
			moves.push(move);
		return moves;
	}

	getPotentialMovesFrom([x,y]) {
		let moves = super.getPotentialMovesFrom([x,y]);
		const piece = this.getPiece(x,y);
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const kp = this.kingPos[color];
		// Add switches (if not under check, from anything but the king)
		if (piece != V.KING && !this.isAttacked(kp, oppCol)) {
      const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
      for (let step of steps) {
        const [i, j] = [x+step[0], y+step[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i,j) == color &&
          this.getPiece(i,j) != piece
        ) {
          const switchMove_s = this.getSwitchMove_s([x,y], [i,j]);
          Array.prototype.push.apply(moves, switchMove_s);
        }
      }
    }
		return moves;
	}

	postPlay(move) {
    // Did some king move?
    move.appear.forEach(a => {
      if (a.p == V.KING) {
        this.kingPos[a.c] = [a.x, a.y];
        this.castleFlags[a.c] = [V.size.y, V.size.y];
      }
    });
    const firstRank = (move.vanish[0].c == 'w' ? 7 : 0);
    for (let coords of [move.start, move.end]) {
      if (
        Object.keys(firstRank).includes(coords.x) &&
        this.castleFlags[firstRank[coords.x]].includes(coords.y)
      ) {
        const c = firstRank[coords.x];
        const flagIdx = (coords.y == this.castleFlags[c][0] ? 0 : 1);
        this.castleFlags[c][flagIdx] = V.size.y;
      }
    }
	}

	postUndo(move) {
    // Did some king move?
    move.vanish.forEach(v => {
      if (v.p == V.KING) this.kingPos[v.c] = [v.x, v.y];
    });
	}

	static get SEARCH_DEPTH() {
    // Branching factor is quite high
    return 2;
  }

  getAllPotentialMoves() {
    // Since this function is used only for computer play,
    // remove duplicate switches:
    return super.getAllPotentialMoves().filter(m => {
      return (
        m.appear.length == 1 ||
        (m.appear[0].p == V.KING && m.appear[1].p == V.ROOK) ||
        (m.appear[1].x <= m.vanish[1].x && m.appear[1].y <= m.vanish[1].y)
      );
    });
  }

  getNotation(move) {
    if (move.appear.length == 1)
      // Normal move
      return super.getNotation(move);
    if (move.appear[0].p == V.KING && move.appear[1].p == V.ROOK)
      // Castle
      return (move.end.y < move.start.y ? "0-0-0" : "0-0");
    // Switch
    return "S" + V.CoordsToSquare(move.start) + V.CoordsToSquare(move.end);
  }

};
