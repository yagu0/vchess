class HalfRules extends ChessRules
{
	// Standard rules on a 4x8 board with no pawns

	initVariables(fen) { } //nothing to do

	setFlags(fen)
	{
		// No castling, hence no flags; but flags defined for compatibility
		this.castleFlags = { "w":[false,false], "b":[false,false] };
	}

	static get size() { return [8,4]; }

	getPotentialKingMoves(sq)
	{
		const V = VariantRules;
		// No castling
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	isAttacked(sq, colors)
	{
		return (this.isAttackedByRook(sq, colors)
			|| this.isAttackedByKnight(sq, colors)
			|| this.isAttackedByBishop(sq, colors)
			|| this.isAttackedByQueen(sq, colors)
			|| this.isAttackedByKing(sq, colors));
	}

	// Unused:
	updateVariables(move) { }
	unupdateVariables(move) { }

	static get SEARCH_DEPTH() { return 4; }

	static GenRandInitFen()
	{
		let minorPieces = { "w": new Array(4), "b": new Array(4) };
		let majorPieces = { "w": new Array(4), "b": new Array(4) };
		for (let c of ["w","b"])
		{
			// Minor pieces first (on 2nd rank)
			let positions = _.range(4);

			// Get random squares for bishops
			let randIndex = 2 * _.random(1);
			let bishop1Pos = positions[randIndex];
			let randIndex_tmp = 2 * _.random(1) + 1;
			let bishop2Pos = positions[randIndex_tmp];
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			// Get random squares for knights
			randIndex = _.random(1);
			let knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			let knight2Pos = positions[0];

			minorPieces[c][bishop1Pos] = 'b';
			minorPieces[c][bishop2Pos] = 'b';
			minorPieces[c][knight1Pos] = 'n';
			minorPieces[c][knight2Pos] = 'n';

			// Major pieces then (on 1st rank)
			positions = _.range(4);

			// Get random square for queen
			randIndex = _.random(3);
			let queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Rooks and king positions:
			let rook1Pos = positions[0];
			let kingPos = positions[1];
			let rook2Pos = positions[2];

			majorPieces[c][rook1Pos] = 'r';
			majorPieces[c][rook2Pos] = 'r';
			majorPieces[c][kingPos] = 'k';
			majorPieces[c][queenPos] = 'q';
		}
		return majorPieces["b"].join("") + "/" + minorPieces["b"].join("") + "/4/4/4/4/" +
			minorPieces["w"].join("").toUpperCase() + "/" +
			majorPieces["w"].join("").toUpperCase() + " 0000"; //TODO: flags?!
	}
}
