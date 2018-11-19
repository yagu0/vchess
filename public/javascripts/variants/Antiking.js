class AntikingRules
{
	// Path to pieces
	static getPpath(b)
	{
		return b[1]=='a' ? "Antiking/"+b : b;
	}

	static get ANTIKING() { return 'a'; }

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

// TODO: generaliser (à moindre coût) base_rules ? Ou spécialiser variantes ?

	getPotentialAntikingMoves(x, y, c)
	{
		// TODO
	}

// TODO: need to re-think some logic, since antikings capture same color

	isAttacked(sq, color)
	{
		return (this.isAttackedByPawn(sq, color)
			|| this.isAttackedByRook(sq, color)
			|| this.isAttackedByKnight(sq, color)
			|| this.isAttackedByBishop(sq, color)
			|| this.isAttackedByQueen(sq, color)
			|| this.isAttackedByKing(sq, color)); //...
	}

	isAttackedByAntiking(sq, color)
	{
		// TODO
	}

	underCheck(move, c)
	{
		this.play(move);
		let res = this.isAttacked(this.kingPos[c], this.getOppCol(c));
		// TODO: also check that antiking is still in check
		this.undo(move);
		return res;
	}

	getCheckSquares(move, c)
	{
		this.play(move);
		// TODO
		let res = this.isAttacked(this.kingPos[c], this.getOppCol(c))
			? [ JSON.parse(JSON.stringify(this.kingPos[c])) ] //need to duplicate!
			: [ ];
		this.undo(move);
		return res;
	}

	// Apply a move on board
	static PlayOnBoard(board, move)
	{
		for (let psq of move.vanish)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.appear)
			board[psq.x][psq.y] = psq.c + psq.p;
	}
	// Un-apply the played move
	static UndoOnBoard(board, move)
	{
		for (let psq of move.appear)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.vanish)
			board[psq.x][psq.y] = psq.c + psq.p;
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

	// Pieces values
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
		// TODO: no need all code, just add an antiking at rondom on 3rd ranks
		let pieces = [new Array(8), new Array(8)];
		// Shuffle pieces on first and last rank
		for (let c = 0; c <= 1; c++)
		{
			let positions = _.range(8);

			// Get random squares for bishops
			let randIndex = 2 * _.random(3);
			let bishop1Pos = positions[randIndex];
			// The second bishop must be on a square of different color
			let randIndex_tmp = 2 * _.random(3) + 1;
			let bishop2Pos = positions[randIndex_tmp];
			// Remove chosen squares
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			// Get random squares for knights
			randIndex = _.random(5);
			let knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			randIndex = _.random(4);
			let knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Get random square for queen
			randIndex = _.random(3);
			let queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Rooks and king positions are now fixed, because of the ordering rook-king-rook
			let rook1Pos = positions[0];
			let kingPos = positions[1];
			let rook2Pos = positions[2];

			// Finally put the shuffled pieces in the board array
			pieces[c][rook1Pos] = 'r';
			pieces[c][knight1Pos] = 'n';
			pieces[c][bishop1Pos] = 'b';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight2Pos] = 'n';
			pieces[c][rook2Pos] = 'r';
		}
		let fen = pieces[0].join("") +
			"/pppppppp/8/8/8/8/PPPPPPPP/" +
			pieces[1].join("").toUpperCase() +
			" 1111"; //add flags
		return fen;
	}
}
