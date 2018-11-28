class CrazyhouseRules extends ChessRules
{
	initVariables(fen)
	{
		super.initVariables(fen);
		// Also init reserves (used by the interface to show landing pieces)
		const V = VariantRules;
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
		// May be a continuation: adjust numbers of pieces according to captures + rebirths
		this.moves.forEach(m => {
			if (m.vanish.length == 2)
				this.reserve[m.appear[0].c][m.vanish[1].p]++;
			else if (m.vanish.length == 0)
				this.reserve[m.appear[0].c][m.appear[0].p]--;
		});
	}

	// Used by the interface:
	getReservePpath(color, index)
	{
		return color + VariantRules.RESERVE_PIECES[index];
	}

	// Put an ordering on reserve pieces
	static get RESERVE_PIECES() {
		const V = VariantRules;
		return [V.PAWN,V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
	}

	getReserveMoves([x,y])
	{
		const color = this.turn;
		const p = VariantRules.RESERVE_PIECES[y];
		if (this.reserve[color][p] == 0)
			return [];
		let moves = [];
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY)
				{
					let mv = new Move({
						appear: [
							new PiPo({
								x: i,
								y: j,
								c: color,
								p: p
							})
						]
					});
					moves.push(mv);
				}
			}
		}
		return moves;
	}

	getPotentialMovesFrom([x,y])
	{
		const sizeX = VariantRules.size[0];
		if (x < sizeX)
			return super.getPotentialMovesFrom([x,y]);
		// Reserves, outside of board: x == sizeX
		return this.getReserveMoves([x,y]);
	}

	getAllValidMoves()
	{
		let moves = super.getAllValidMoves();
		const color = this.turn;
		const sizeX = VariantRules.size[0];
		for (let i=0; i<VariantRules.RESERVE_PIECES.length; i++)
			moves = moves.concat(this.getReserveMoves([sizeX,i]));
		return this.filterValid(moves);
	}

	atLeastOneMove()
	{
		if (!super.atLeastOneMove())
		{
			const sizeX = VariantRules.size[0];
			// Scan for reserve moves
			for (let i=0; i<VariantRules.RESERVE_PIECES.length; i++)
			{
				let moves = this.filterValid(this.getReserveMoves([sizeX,i]));
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
		const color = this.turn;
		if (move.vanish.length==2)
			this.reserve[color][move.appear[0].p]++;
		if (move.vanish.length==0)
			this.reserve[color][move.appear[0].p]--;
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const color = this.turn;
		if (move.vanish.length==2)
			this.reserve[color][move.appear[0].p]--;
		if (move.vanish.length==0)
			this.reserve[color][move.appear[0].p]++;
	}

	static get SEARCH_DEPTH() { return 2; } //high branching factor

	getNotation(move)
	{
		if (move.vanish.length > 0)
			return super.getNotation(move);
		// Rebirth:
		const piece =
			(move.appear[0].p != VariantRules.PAWN ? move.appear.p.toUpperCase() : "");
		const finalSquare =
			String.fromCharCode(97 + move.end.y) + (VariantRules.size[0]-move.end.x);
		return piece + "@" + finalSquare;
	}
}
