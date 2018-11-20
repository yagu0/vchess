class ZenRules extends ChessRules
{
	// NOTE: enPassant, if enabled, would need to redefine carefully getEpSquare
	getEpSquare(move)
	{
		return undefined;
	}

	// TODO: some duplicated code in 2 next functions
	getSlideNJumpMoves([x,y], steps, oneStep)
	{
		const color = this.getColor(x,y);
		var moves = [];
		let [sizeX,sizeY] = VariantRules.size;
		outerLoop:
		for (var loop=0; loop<steps.length; loop++)
		{
			var step = steps[loop];
			var i = x + step[0];
			var j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] == VariantRules.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
				if (!!oneStep)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			// No capture check: handled elsewhere (next method)
		}
		return moves;
	}

	// follow steps from x,y until something is met.
	// if met piece is opponent and same movement (asA): eat it!
	findCaptures_aux([x,y], asA)
	{
		const color = this.getColor(x,y);
		var moves = [];
		var V = VariantRules;
		var steps = asA != V.PAWN
			? V.steps[asA]
			: color=='w' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
		var oneStep = (asA==V.KNIGHT || asA==V.PAWN); //we don't capture king
		let [sizeX,sizeY] = V.size;
		let lastRank = (color == 'w' ? 0 : sizeY-1);
		let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
		outerLoop:
		for (var loop=0; loop<steps.length; loop++)
		{
			var step = steps[loop];
			var i = x + step[0];
			var j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY
				&& this.board[i][j] == V.EMPTY)
			{
				if (oneStep)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			if (i>=0 && i<sizeX && j>=0 && j<sizeY &&
				this.getColor(i,j) == this.getOppCol(color) && this.getPiece(i,j) == asA)
			{
				// eat!
				if (this.getPiece(x,y) == V.PAWN && i == lastRank)
				{
					// Special case of promotion:
					promotionPieces.forEach(p => {
						moves.push(this.getBasicMove([x,y], [i,j], {c:color,p:p}));
					});
				}
				else
				{
					// All other cases
					moves.push(this.getBasicMove([x,y], [i,j]));
				}
			}
		}
		return moves;
	}

	// Find possible captures from a square: look in every direction!
	findCaptures(sq)
	{
		var moves = [];

		// PAWN
		Array.prototype.push.apply(moves, this.findCaptures_aux(sq, VariantRules.PAWN));

		// ROOK
		Array.prototype.push.apply(moves, this.findCaptures_aux(sq, VariantRules.ROOK));

		// KNIGHT
		Array.prototype.push.apply(moves, this.findCaptures_aux(sq, VariantRules.KNIGHT));

		// BISHOP
		Array.prototype.push.apply(moves, this.findCaptures_aux(sq, VariantRules.BISHOP));

		// QUEEN
		Array.prototype.push.apply(moves, this.findCaptures_aux(sq, VariantRules.QUEEN));

		return moves;
	}

	getPotentialPawnMoves([x,y])
	{
		const color = this.getColor(x,y);
		var moves = [];
		var V = VariantRules;
		let [sizeX,sizeY] = VariantRules.size;
		let shift = (color == 'w' ? -1 : 1);
		let startRank = (color == 'w' ? sizeY-2 : 1);
		let firstRank = (color == 'w' ? sizeY-1 : 0);
		let lastRank = (color == "w" ? 0 : sizeY-1);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRank)
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y]));
				if ([startRank,firstRank].includes(x) && this.board[x+2*shift][y] == V.EMPTY)
				{
					//two squares jump
					moves.push(this.getBasicMove([x,y], [x+2*shift,y]));
				}
			}
		}

		if (x+shift == lastRank)
		{
			// Promotion
			let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
			promotionPieces.forEach(p => {
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:p}));
			});
		}

		// No en passant here

		// Add "zen" captures
		Array.prototype.push.apply(moves, this.findCaptures([x,y]));

		return moves;
	}

	getPotentialRookMoves(sq)
	{
		let noCaptures = this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.ROOK]);
		let captures = this.findCaptures(sq);
		return noCaptures.concat(captures);
	}

	getPotentialKnightMoves(sq)
	{
		let noCaptures = this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.KNIGHT], "oneStep");
		let captures = this.findCaptures(sq);
		return noCaptures.concat(captures);
	}

	getPotentialBishopMoves(sq)
	{
		let noCaptures = this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.BISHOP]);
		let captures = this.findCaptures(sq);
		return noCaptures.concat(captures);
	}

	getPotentialQueenMoves(sq)
	{
		let noCaptures = this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.QUEEN]);
		let captures = this.findCaptures(sq);
		return noCaptures.concat(captures);
	}

	getPotentialKingMoves(sq)
	{
		// Initialize with normal moves
		let noCaptures = this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.QUEEN], "oneStep");
		let captures = this.findCaptures(sq);
		return noCaptures.concat(captures).concat(this.getCastleMoves(sq));
	}

	getNotation(move)
	{
		// Recognize special moves first
		if (move.appear.length == 2)
		{
			// castle
			if (move.end.y < move.start.y)
				return "0-0-0";
			else
				return "0-0";
		}

		// Translate initial square (because pieces may fly unusually in this variant!)
		let initialSquare =
			String.fromCharCode(97 + move.start.y) + (VariantRules.size[0]-move.start.x);

		// Translate final square
		let finalSquare =
			String.fromCharCode(97 + move.end.y) + (VariantRules.size[0]-move.end.x);

		let notation = "";
		let piece = this.getPiece(move.start.x, move.start.y);
		if (piece == VariantRules.PAWN)
		{
			// pawn move (TODO: enPassant indication)
			if (move.vanish.length > 1)
			{
				// capture
				notation = initialSquare + "x" + finalSquare;
			}
			else //no capture
				notation = finalSquare;
			if (piece != move.appear[0].p) //promotion
				notation += "=" + move.appear[0].p.toUpperCase();
		}

		else
		{
			// Piece movement
			notation = piece.toUpperCase();
			if (move.vanish.length > 1)
				notation += initialSquare + "x";
			notation += finalSquare;
		}
		return notation;
	}

	static get VALUES() { //TODO: experimental
		return {
			'p': 1,
			'r': 3,
			'n': 2,
			'b': 2,
			'q': 5,
			'k': 1000
		}
	}
}
