class UpsidedownRules extends ChessRUles
{
	static HasFlags() { return false; }

	getPotentialKingMoves(sq)
	{
		// No castle
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	static GenRandInitFen()
	{
		let pieces = { "w": new Array(8), "b": new Array(8) };
		for (let c of ["w","b"])
		{
			let positions = _.range(8);

			let randIndex = 2 * _.random(3);
			let bishop1Pos = positions[randIndex];
			let randIndex_tmp = 2 * _.random(3) + 1;
			let bishop2Pos = positions[randIndex_tmp];
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			randIndex = _.random(5);
			let knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			randIndex = _.random(4);
			let knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(3);
			let queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			let rook1Pos = positions[0];
			let kingPos = positions[1];
			let rook2Pos = positions[2];

			pieces[c][rook1Pos] = 'r';
			pieces[c][knight1Pos] = 'n';
			pieces[c][bishop1Pos] = 'b';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight2Pos] = 'n';
			pieces[c][rook2Pos] = 'r';
		}
		return pieces["w"].join("") +
			"/PPPPPPPP/8/8/8/8/pppppppp/" +
			pieces["b"].join("").toUpperCase() +
			" w 1111 -"; //add turn + flags + enpassant
	}
}

const VariantRules = UpsidedownRules;
