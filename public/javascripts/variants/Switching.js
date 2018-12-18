class SwitchingRules extends ChessRules
{
	// Build switch move between squares x1,y1 and x2,y2
	getSwitchMove_s([x1,y1],[x2,y2])
	{
		const c = this.getColor(x1,y1); //same as color at square 2
		const p1 = this.getPiece(x1,y1);
		const p2 = this.getPiece(x2,y2);
		if (p1 == V.KING && p2 == V.ROOK)
			return []; //avoid duplicate moves (potential conflict with castle)
		let move = new Move({
			appear: [
				new PiPo({x:x2,y:y2,c:c,p:p1}),
				new PiPo({x:x1,y:y1,c:c,p:p2})
			],
			vanish: [
				new PiPo({x:x1,y:y1,c:c,p:p1}),
				new PiPo({x:x2,y:y2,c:c,p:p2})
			],
			start: {x:x1,y:y1},
			end: {x:x2,y:y2}
		});
		// Move completion: promote switched pawns (as in Magnetic)
		const lastRank = (c == "w" ? 0 : V.size.x-1);
		let moves = [];
		if ((p1==V.PAWN && x2==lastRank) || (p2==V.PAWN && x1==lastRank))
		{
			const idx = (p1==V.PAWN ? 0 : 1);
			move.appear[idx].p = V.ROOK;
			moves.push(move);
			for (let piece of [V.KNIGHT, V.BISHOP, V.QUEEN])
			{
				let cmove = JSON.parse(JSON.stringify(move));
				cmove.appear[idx].p = piece;
				moves.push(cmove);
			}
			if (idx == 1)
			{
				// Swap moves[i].appear[0] and [1] for moves presentation [TODO...]
				moves.forEach(m => {
					let tmp = m.appear[0];
					m.appear[0] = m.appear[1];
					m.appear[1] = tmp;
				});
			}
		}
		else //other cases
			moves.push(move);
		return moves;
	}

	getPotentialMovesFrom([x,y], computer)
	{
		let moves = super.getPotentialMovesFrom([x,y]);
		// Add switches: respecting chessboard ordering if "computer" is on
		const color = this.turn;
		const piece = this.getPiece(x,y);
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const kp = this.kingPos[color];
		const oppCol = this.getOppCol(color);
		for (let step of steps)
		{
			let [i,j] = [x+step[0],y+step[1]];
			if (!!computer && (i<x || (i==x && j<y)))
				continue; //only switch with superior indices
			if (V.OnBoard(i,j) && this.board[i][j]!=V.EMPTY
				&& this.getColor(i,j)==color && this.getPiece(i,j)!=piece
				// No switching under check (theoretically non-king pieces could, but not)
				&& !this.isAttacked(kp, [oppCol]))
			{
				let switchMove_s = this.getSwitchMove_s([x,y],[i,j]);
				if (switchMove_s.length == 1)
					moves.push(switchMove_s[0]);
				else //promotion
					moves = moves.concat(switchMove_s);
			}
		}
		return moves;
	}

	getAllValidMoves(computer)
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		let potentialMoves = [];
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] != V.EMPTY && this.getColor(i,j) == color)
				{
					Array.prototype.push.apply(potentialMoves,
						this.getPotentialMovesFrom([i,j], computer));
				}
			}
		}
		return this.filterValid(potentialMoves);
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		if (move.appear.length == 2 && move.vanish.length == 2
			&& move.appear[1].p == V.KING)
		{
			// Switch with the king; not castle, and not handled by main class
			const color = this.getColor(move.start.x, move.start.y);
			this.kingPos[color] = [move.appear[1].x, move.appear[1].y];
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		if (move.appear.length == 2 && move.vanish.length == 2
			&& move.appear[1].p == V.KING)
		{
			const color = this.getColor(move.start.x, move.start.y);
			this.kingPos[color] = [move.appear[0].x, move.appear[0].y];
		}
	}

	static get SEARCH_DEPTH() { return 2; } //high branching factor

	getNotation(move)
	{
		if (move.appear.length == 1)
			return super.getNotation(move); //no switch
		// Switch or castle
		if (move.appear[0].p == V.KING && move.appear[1].p == V.ROOK)
			return (move.end.y < move.start.y ? "0-0-0" : "0-0");
		// Switch:
		const startSquare =
			String.fromCharCode(97 + move.start.y) + (V.size.x-move.start.x);
		const finalSquare =
			String.fromCharCode(97 + move.end.y) + (V.size.x-move.end.x);
		return "S" + startSquare + finalSquare;
	}
}

const VariantRules = SwitchingRules;
