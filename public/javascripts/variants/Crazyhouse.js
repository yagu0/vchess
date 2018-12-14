class CrazyhouseRules extends ChessRules
{
	initVariables(fen)
	{
		super.initVariables(fen);
		// Also init reserves (used by the interface to show landing pieces)
		this.reserve =
		{
			"w":
			{
				[V.PAWN]: 0,
				[V.ROOK]: 0,
				[V.KNIGHT]: 0,
				[V.BISHOP]: 0,
				[V.QUEEN]: 0,
			},
			"b":
			{
				[V.PAWN]: 0,
				[V.ROOK]: 0,
				[V.KNIGHT]: 0,
				[V.BISHOP]: 0,
				[V.QUEEN]: 0,
			}
		};
		this.promoted = doubleArray(V.size.x, V.size.y, false);
		// May be a continuation: adjust numbers of pieces in reserve + promoted pieces
		this.moves.forEach(m => { this.updateVariables(m); });
	}

	getColor(i,j)
	{
		if (i >= V.size.x)
			return (i==V.size.x ? "w" : "b");
		return this.board[i][j].charAt(0);
	}
	getPiece(i,j)
	{
		if (i >= V.size.x)
			return V.RESERVE_PIECES[j];
		return this.board[i][j].charAt(1);
	}

	// Used by the interface:
	getReservePpath(color, index)
	{
		return color + V.RESERVE_PIECES[index];
	}

	// Ordering on reserve pieces
	static get RESERVE_PIECES() {
		return [V.PAWN,V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
	}

	getReserveMoves([x,y])
	{
		const color = this.turn;
		const p = V.RESERVE_PIECES[y];
		if (this.reserve[color][p] == 0)
			return [];
		let moves = [];
		const pawnShift = (p==V.PAWN ? 1 : 0);
		for (let i=pawnShift; i<V.size.x-pawnShift; i++)
		{
			for (let j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] == V.EMPTY)
				{
					let mv = new Move({
						appear: [
							new PiPo({
								x: i,
								y: j,
								c: color,
								p: p
							})
						],
						vanish: [],
						start: {x:x, y:y}, //a bit artificial...
						end: {x:i, y:j}
					});
					moves.push(mv);
				}
			}
		}
		return moves;
	}

	getPotentialMovesFrom([x,y])
	{
		if (x >= V.size.x)
		{
			// Reserves, outside of board: x == sizeX(+1)
			return this.getReserveMoves([x,y]);
		}
		// Standard moves
		return super.getPotentialMovesFrom([x,y]);
	}

	getAllValidMoves()
	{
		let moves = super.getAllValidMoves();
		const color = this.turn;
		for (let i=0; i<V.RESERVE_PIECES.length; i++)
			moves = moves.concat(this.getReserveMoves([V.size.x+(color=="w"?0:1),i]));
		return this.filterValid(moves);
	}

	atLeastOneMove()
	{
		if (!super.atLeastOneMove())
		{
			const color = this.turn;
			// Search one reserve move
			for (let i=0; i<V.RESERVE_PIECES.length; i++)
			{
				let moves = this.filterValid(
					this.getReserveMoves([V.size.x+(this.turn=="w"?0:1), i]) );
				if (moves.length > 0)
					return true;
			}
			return false;
		}
		return true;
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		if (move.vanish.length == 2 && move.appear.length == 2)
			return; //skip castle
		const color = this.turn;
		if (move.vanish.length == 0)
		{
			this.reserve[color][move.appear[0].p]--;
			return;
		}
		move.movePromoted = this.promoted[move.start.x][move.start.y];
		move.capturePromoted = this.promoted[move.end.x][move.end.y]
		this.promoted[move.start.x][move.start.y] = false;
		this.promoted[move.end.x][move.end.y] = move.movePromoted
			|| (move.vanish[0].p == V.PAWN && move.appear[0].p != V.PAWN);
		if (move.capturePromoted)
			this.reserve[color][V.PAWN]++;
		else if (move.vanish.length == 2)
			this.reserve[color][move.vanish[1].p]++;
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		if (move.vanish.length == 2 && move.appear.length == 2)
			return;
		const color = this.turn;
		if (move.vanish.length == 0)
		{
			this.reserve[color][move.appear[0].p]++;
			return;
		}
		if (move.movePromoted)
			this.promoted[move.start.x][move.start.y] = true;
		this.promoted[move.end.x][move.end.y] = move.capturePromoted;
		if (move.capturePromoted)
			this.reserve[color][V.PAWN]--;
		else if (move.vanish.length == 2)
			this.reserve[color][move.vanish[1].p]--;
	}

	static get SEARCH_DEPTH() { return 2; } //high branching factor

	evalPosition()
	{
		let evaluation = super.evalPosition();
		// Add reserves:
		for (let i=0; i<V.RESERVE_PIECES.length; i++)
		{
			const p = V.RESERVE_PIECES[i];
			evaluation += this.reserve["w"][p] * V.VALUES[p];
			evaluation -= this.reserve["b"][p] * V.VALUES[p];
		}
		return evaluation;
	}

	getNotation(move)
	{
		if (move.vanish.length > 0)
			return super.getNotation(move);
		// Rebirth:
		const piece =
			(move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "");
		const finalSquare =
			String.fromCharCode(97 + move.end.y) + (V.size.x-move.end.x);
		return piece + "@" + finalSquare;
	}

	getLongNotation(move)
	{
		if (move.vanish.length > 0)
			return super.getLongNotation(move);
		const finalSquare =
			String.fromCharCode(97 + move.end.y) + (V.size.x-move.end.x);
		return "@" + finalSquare;
	}
}
