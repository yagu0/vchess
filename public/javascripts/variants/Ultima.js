class UltimaRules extends ChessRules
{
	static getPpath(b)
	{
		if (b[1] == "m") //'m' for Immobilizer (I is too similar to 1)
			return "Ultima/" + b;
		return b; //usual piece
	}

	initVariables(fen)
	{
		this.kingPos = {'w':[-1,-1], 'b':[-1,-1]};
		const fenParts = fen.split(" ");
		const position = fenParts[0].split("/");
		for (let i=0; i<position.length; i++)
		{
			let k = 0;
			for (let j=0; j<position[i].length; j++)
			{
				switch (position[i].charAt(j))
				{
					case 'k':
						this.kingPos['b'] = [i,k];
						break;
					case 'K':
						this.kingPos['w'] = [i,k];
						break;
					default:
						let num = parseInt(position[i].charAt(j));
						if (!isNaN(num))
							k += (num-1);
				}
				k++;
			}
		}
		this.epSquares = []; //no en-passant here
	}

	setFlags(fen)
	{
		// TODO: for compatibility?
		this.castleFlags = {"w":[false,false], "b":[false,false]};
	}

	static get IMMOBILIZER() { return 'm'; }
	// Although other pieces keep their names here for coding simplicity,
	// keep in mind that:
	//  - a "rook" is a coordinator, capturing by coordinating with the king
	//  - a "knight" is a long-leaper, capturing as in draughts
	//  - a "bishop" is a chameleon, capturing as its prey
	//  - a "queen" is a withdrawer, capturing by moving away from pieces

	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case VariantRules.IMMOBILIZER:
				return this.getPotentialImmobilizerMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y]);
		}
		// TODO: add potential suicides as a move "taking the immobilizer"
		// TODO: add long-leaper captures
		// TODO: mark matching coordinator/withdrawer/chameleon moves as captures
		// (will be a bit tedious for chameleons)
		// --> filter directly in functions below
	}

	getSlideNJumpMoves([x,y], steps, oneStep)
	{
		const color = this.getColor(x,y);
		const piece = this.getPiece(x,y);
		let moves = [];
		const [sizeX,sizeY] = VariantRules.size;
		outerLoop:
		for (let step of steps)
		{
			let i = x + step[0];
			let j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] == VariantRules.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			// Only king can take on occupied square:
			if (piece==VariantRules.KING && i>=0 && i<sizeX && j>=0
				&& j<sizeY && this.canTake([x,y], [i,j]))
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
			}
		}
		return moves;
	}

	getPotentialPawnMoves([x,y])
	{
		return super.getPotentialRookMoves([x,y]);
	}

	getPotentialRookMoves(sq)
	{
		return super.getPotentialQueenMoves(sq);
	}

	getPotentialKnightMoves(sq)
	{
		return super.getPotentialQueenMoves(sq);
	}

	getPotentialBishopMoves(sq)
	{
		return super.getPotentialQueenMoves(sq);
	}

	getPotentialQueenMoves(sq)
	{
		return super.getPotentialQueenMoves(sq);
	}

	getPotentialKingMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	// isAttacked() is OK because the immobilizer doesn't take

	isAttackedByPawn([x,y], colors)
	{
		// Square (x,y) must be surrounded by two enemy pieces,
		// and one of them at least should be a pawn
		return false;
	}

	isAttackedByRook(sq, colors)
	{
		// Enemy king must be on same file and a rook on same row (or reverse)
	}

	isAttackedByKnight(sq, colors)
	{
		// Square (x,y) must be on same line as a knight,
		// and there must be empty square(s) behind.
	}

	isAttackedByBishop(sq, colors)
	{
		// switch on piece nature on square sq: a chameleon attack as this piece
		// ==> call the appropriate isAttackedBy... (exception of immobilizers)
		// Other exception: a chameleon cannot attack a chameleon (seemingly...)
	}

	isAttackedByQueen(sq, colors)
	{
		// Square (x,y) must be adjacent to a queen, and the queen must have
		// some free space in the opposite direction from (x,y)
	}

	updateVariables(move)
	{
		// Just update king position
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		if (piece == VariantRules.KING && move.appear.length > 0)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
		}
	}

	static get VALUES() { //TODO: totally experimental!
		return {
			'p': 1,
			'r': 2,
			'n': 5,
			'b': 3,
			'q': 3,
			'm': 5,
			'k': 1000
		};
	}

	static get SEARCH_DEPTH() { return 2; } //TODO?

	static GenRandInitFen()
	{
		let pieces = { "w": new Array(8), "b": new Array(8) };
		// Shuffle pieces on first and last rank
		for (let c of ["w","b"])
		{
			let positions = _.range(8);
			// Get random squares for every piece, totally freely

			let randIndex = _.random(7);
			const bishop1Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(6);
			const bishop2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(5);
			const knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(4);
			const knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(3);
			const queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(2);
			const kingPos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(1);
			const rookPos = positions[randIndex];
			positions.splice(randIndex, 1);
			const immobilizerPos = positions[2];

			pieces[c][bishop1Pos] = 'b';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight1Pos] = 'n';
			pieces[c][knight2Pos] = 'n';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][rookPos] = 'r';
			pieces[c][immobilizerPos] = 'm';
		}
		return pieces["b"].join("") +
			"/pppppppp/8/8/8/8/PPPPPPPP/" +
			pieces["w"].join("").toUpperCase() +
			" 0000"; //TODO: flags?!
	}

	getFlagsFen()
	{
		return "0000"; //TODO: or "-" ?
	}
}
