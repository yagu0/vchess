//https://www.chessvariants.com/large.dir/wildebeest.html
class GrandRules extends ChessRules
{
	static getPpath(b)
	{
		const V = VariantRules;
		return ([V.CAMEL,V.WILDEBEEST].includes(b[1]) ? "Wildebeest/" : "") + b;
	}

	static get CAMEL() { return 'c'; }
	static get WILDEBEEST() { return 'w'; }

	static get steps() {
		return Object.assign(
			ChessRules.steps, //add camel moves:
			{'c': [ [-3,-1],[-3,1],[-1,-3],[-1,3],[1,-3],[1,3],[3,-1],[3,1] ]}
		);
	}

// TODO: IN epSquares (return array), not return singleton. Easy. Adapt
// just here for now...
	getEpSquare(move)
	{
		const [sx,sy,ex] = [move.start.x,move.start.y,move.end.x];
		if (this.getPiece(sx,sy) == VariantRules.PAWN && Math.abs(sx - ex) == 2)
		{
			return {
				x: (sx + ex)/2,
				y: sy
			};
		}
		return undefined; //default
	}

	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case VariantRules.CAMEL:
				return this.getPotentialCamelMoves([x,y]);
			case VariantRules.WILDEBEEST:
				return this.getPotentialWildebeestMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y])
		}
	}

	// TODO: several changes (promote to queen or wildebeest)
	getPotentialPawnMoves([x,y])
	{
		const color = this.turn;
		let moves = [];
		const V = VariantRules;
		const [sizeX,sizeY] = VariantRules.size;
		const shift = (color == "w" ? -1 : 1);
		const firstRank = (color == 'w' ? sizeY-1 : 0);
		const startRank = (color == "w" ? sizeY-2 : 1);
		const lastRank = (color == "w" ? 0 : sizeY-1);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRank)
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y]));
				// Next condition because variants with pawns on 1st rank generally allow them to jump
				if ([startRank,firstRank].includes(x) && this.board[x+2*shift][y] == V.EMPTY)
				{
					// Two squares jump
					moves.push(this.getBasicMove([x,y], [x+2*shift,y]));
				}
			}
			// Captures
			if (y>0 && this.canTake([x,y], [x+shift,y-1]) && this.board[x+shift][y-1] != V.EMPTY)
				moves.push(this.getBasicMove([x,y], [x+shift,y-1]));
			if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1]) && this.board[x+shift][y+1] != V.EMPTY)
				moves.push(this.getBasicMove([x,y], [x+shift,y+1]));
		}

		if (x+shift == lastRank)
		{
			// Promotion
			let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN];
			promotionPieces.forEach(p => {
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:p}));
				// Captures
				if (y>0 && this.canTake([x,y], [x+shift,y-1]) && this.board[x+shift][y-1] != V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y-1], {c:color,p:p}));
				if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1]) && this.board[x+shift][y+1] != V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y+1], {c:color,p:p}));
			});
		}

		// En passant
		const Lep = this.epSquares.length;
		const epSquare = Lep>0 ? this.epSquares[Lep-1] : undefined;
		if (!!epSquare && epSquare.x == x+shift && Math.abs(epSquare.y - y) == 1)
		{
			let epStep = epSquare.y - y;
			var enpassantMove = this.getBasicMove([x,y], [x+shift,y+epStep]);
			enpassantMove.vanish.push({
				x: x,
				y: y+epStep,
				p: 'p',
				c: this.getColor(x,y+epStep)
			});
			moves.push(enpassantMove);
		}

		return moves;
	}

	getPotentialCamelMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.CAMEL], "oneStep");
	}

	getPotentialWildebeestMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT].concat(V.steps[V.CAMEL]));
	}

	// TODO: getCastleMoves, generalize a bit to include castleSquares as static variables
	// ==> but this won't be exactly Wildebeest... think about it.

	// TODO: also generalize lastRank ==> DO NOT HARDCODE 7 !!!

	isAttacked(sq, colors)
	{
		return (super.isAttacked(sq, colors)
			|| this.isAttackedByCamel(sq, colors)
			|| this.isAttackedByWildebeest(sq, colors);
	}

	isAttackedByCamel(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			VariantRules.CAMEL, VariantRules.steps[VariantRules.CAMEL]);
	}

	isAttackedByWildebeest(sq, colors)
	{
		const V = VariantRules;
		return this.isAttackedBySlideNJump(sq, colors, V.WILDEBEEST,
			V.steps[V.KNIGHT].concat(V.steps[V.CAMEL]));
	}

	static get VALUES() {
		return Object.assign(
			ChessRules.VALUES,
			{'c': 3, 'w': 7} //experimental
		);
	}

	static get SEARCH_DEPTH() { return 2; }

	// TODO:
	static GenRandInitFen()
	{
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
