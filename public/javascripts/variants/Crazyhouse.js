class CrazyhouseRules extends ChessRules
{
	initVariables(fen)
	{
		super.initVariables();
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
		// It may be a continuation: adjust numbers of pieces according to captures + rebirths
		// TODO
	}

	// Used by the interface:
	getReservePieces(color)
	{
		return {
			[color+V.PAWN]: this.reserve[color][V.PAWN],
			[color+V.ROOK]: this.reserve[color][V.ROOK],
			[color+V.KNIGHT]: this.reserve[color][V.KNIGHT],
			[color+V.BISHOP]: this.reserve[color][V.BISHOP],
			[color+V.QUEEN]: this.reserve[color][V.QUEEN],
		};
	}

	getPotentialMovesFrom([x,y])
	{
		let moves = super.getPotentialMovesFrom([x,y]);
		// Add landing moves:
		const color = this.turn;
		Object.keys(this.reserve[color]).forEach(p => {

			moves.push(...); //concat... just appear
		});
		return moves;
	}

	// TODO: condition "if this is reserve" --> special square !!! coordinates ??
	getPossibleMovesFrom(sq)
	{
		// Assuming color is right (already checked)
		return this.filterValid( this.getPotentialMovesFrom(sq) );
	}

	// TODO: add reserve moves
	getAllValidMoves()
	{

	}

	// TODO: also
	atLeastOneMove()
	{

	}

	// TODO: update reserve
	updateVariables(move)
	{
	}
	unupdateVariables(move)
	{
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
