class AntikingRules
{
	// Path to pieces
	static getPpath(b)
	{
		return b[1]=='a' ? "Antiking/"+b : b;
	}

	static get ANTIKING() { return 'a'; }
	
	initVariables(fen)
	{
		super.initVariables(fen);
		// TODO: initialize this.antikingPos[...]
	}

	canTake(color1, color2, [x,y])
	{
		const piece = this.getPiece(x,y);
		return (piece != "a" && color1 != color2) || (piece == "a" && color1 == color2);
	}

	getPotentialMovesFrom([x,y])
	{
		let c = this.getColor(x,y);
		switch (this.getPiece(x,y))
		{
			case VariantRules.ANTIKING:
				return this.getPotentialAntikingMoves(x,y,c);
			default:
				return super.getPotentielMovesFrom([x,y]);
		}
	}

	getPotentialAntikingMoves([x,y])
	{
		// TODO
	}

	isAttacked(sq, colors)
	{
		return (super.isAttacked(sq, colors) || this.isAttackedByAntiking(sq, colors));
	}

	isAttackedByAntiking(sq, color)
	{
		// TODO
	}

	underCheck(move)
	{
		const c = this.turn;
		this.play(move);
		let res = this.isAttacked(this.kingPos[c], this.getOppCol(c));
		// TODO: also check that antiking is still in check
		this.undo(move);
		return res;
	}

	getCheckSquares(move)
	{
		this.play(move);
		const c = this.turn;
		// TODO
		let res = this.isAttacked(this.kingPos[c], this.getOppCol(c))
			? [ JSON.parse(JSON.stringify(this.kingPos[c])) ]
			: [ ];
		this.undo(move);
		return res;
	}

	// TODO: need antikingPos as well
	updateVariables(move)
	{
		// ...
	}

	unupdateVariables(move)
	{
		// TODO
	}

	checkGameEnd(color)
	{
		// TODO
		if (!this.isAttacked(this.kingPos[color], this.getOppCol(color)))
			return "1/2";
		return color == "w" ? "0-1" : "1-0";
	}

	// Pieces values (TODO: use Object.assign() + ChessRules.VALUES ?)
	static get VALUES() {
		return {
			'p': 1,
			'r': 5,
			'n': 3,
			'b': 3,
			'q': 9,
			'k': 1000,
			'a': 1000
		};
	}

	static GenRandInitFen()
	{
		let randFen = ChessRules.GenRandInitFen();
		// TODO: just add an antiking at random on 3rd ranks
		return randFen;
	}
}
