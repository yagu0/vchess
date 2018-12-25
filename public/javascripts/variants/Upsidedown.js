class UpsidedownRules extends ChessRules
{
	static HasFlags() { return false; }

	static HasEnpassant() { return false; }

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

			let randIndex = _.random(7);
			const kingPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// At least a knight must be next to the king:
			let knight1Pos = undefined;
			if (kingPos == 0)
				knight1Pos = 1;
			else if (kingPos == V.size.y-1)
				knight1Pos = V.size.y-2;
			else
				knight1Pos = kingPos + (Math.random() < 0.5 ? 1 : -1);
			// Search for knight1Pos index in positions and remove it
			const knight1Index = positions.indexOf(knight1Pos);
			positions.splice(knight1Index, 1);

			// King+knight1 are on two consecutive squares: one light, one dark
			randIndex = 2 * _.random(2);
			const bishop1Pos = positions[randIndex];
			let randIndex_tmp = 2 * _.random(2) + 1;
			const bishop2Pos = positions[randIndex_tmp];
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			randIndex = _.random(3);
			const knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(2);
			const queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			const rook1Pos = positions[0];
			const rook2Pos = positions[1];

			pieces[c][rook1Pos] = 'r';
			pieces[c][knight1Pos] = 'n';
			pieces[c][bishop1Pos] = 'b';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight2Pos] = 'n';
			pieces[c][rook2Pos] = 'r';
		}
		return pieces["w"].join("").toUpperCase() +
			"/PPPPPPPP/8/8/8/8/pppppppp/" +
			pieces["b"].join("") +
			" w 1111 -"; //add turn + flags + enpassant
	}
}

const VariantRules = UpsidedownRules;
