class LoserRules extends ChessRules
{
	initVariables(fen)
	{
		const epSq = this.moves.length > 0 ? this.getEpSquare(this.lastMove) : undefined;
		this.epSquares = [ epSq ];
	}

	setFlags(fen)
	{
		// No castling, hence no flags; but flags defined for compatibility
		this.castleFlags = { "w":[false,false], "b":[false,false] };
	}

	getPotentialPawnMoves([x,y])
	{
		let moves = super.getPotentialPawnMoves([x,y]);

		// Complete with promotion(s) into king, if possible
		const color = this.turn;
		const V = VariantRules;
		const [sizeX,sizeY] = VariantRules.size;
		const shift = (color == "w" ? -1 : 1);
		const lastRank = (color == "w" ? 0 : sizeX-1);
		if (x+shift == lastRank)
		{
			// Normal move
			if (this.board[x+shift][y] == V.EMPTY)
				moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:V.KING}));
			// Captures
			if (y>0 && this.canTake([x,y], [x+shift,y-1])
				&& this.board[x+shift][y-1] != V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y-1], {c:color,p:V.KING}));
			}
			if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1])
				&& this.board[x+shift][y+1] != V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y+1], {c:color,p:V.KING}));
			}
		}

		return moves;
	}

	getPotentialKingMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	// Stop at the first capture found (if any)
	atLeastOneCapture()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		const [sizeX,sizeY] = VariantRules.size;
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY && this.getColor(i,j) != oppCol)
				{
					const moves = this.getPotentialMovesFrom([i,j]);
					if (moves.length > 0)
					{
						for (let k=0; k<moves.length; k++)
						{
							if (moves[k].vanish.length==2 && this.filterValid([moves[k]]).length > 0)
								return true;
						}
					}
				}
			}
		}
		return false;
	}

	// Trim all non-capturing moves
	static KeepCaptures(moves)
	{
		return moves.filter(m => { return m.vanish.length == 2; });
	}

	getPossibleMovesFrom(sq)
	{
		let moves = this.filterValid( this.getPotentialMovesFrom(sq) );
		// This is called from interface: we need to know if a capture is possible
		if (this.atLeastOneCapture())
			moves = VariantRules.KeepCaptures(moves);
		return moves;
	}

	getAllValidMoves()
	{
		let moves = super.getAllValidMoves();
		if (moves.some(m => { return m.vanish.length == 2; }))
			moves = VariantRules.KeepCaptures(moves);
		return moves;
	}

	underCheck(move)
	{
		return false; //No notion of check
	}

	getCheckSquares(move)
	{
		return [];
	}

	// Unused:
	updateVariables(move) { }
	unupdateVariables(move) { }

	getFlagsFen()
	{
		return "-";
	}

	checkGameEnd()
	{
		// No valid move: you win!
		return this.turn == "w" ? "1-0" : "0-1";
	}

	static get VALUES() { //experimental...
		return {
			'p': 1,
			'r': 7,
			'n': 3,
			'b': 3,
			'q': 5,
			'k': 5
		};
	}

	static get SEARCH_DEPTH() { return 4; }

	evalPosition()
	{
		return - super.evalPosition(); //better with less material
	}
}
