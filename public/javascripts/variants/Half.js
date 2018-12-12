// Standard rules on a 4x8 board with no pawns
class HalfRules extends ChessRules
{
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
		// No pawns so no ep., but otherwise we must redefine play()
		this.epSquares = [];
	}

	setFlags(fen)
	{
		// No castling, hence no flags; but flags defined for compatibility
		this.castleFlags = { "w":[false,false], "b":[false,false] };
	}

	static get size() { return [4,8]; }

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

	updateVariables(move)
	{
		// Just update king position
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		if (piece == VariantRules.KING)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
		}
	}

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

			// Random square for king (no castle)
			randIndex = _.random(2);
			let kingPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Rooks and king positions:
			let rook1Pos = positions[0];
			let rook2Pos = positions[1];

			majorPieces[c][rook1Pos] = 'r';
			majorPieces[c][rook2Pos] = 'r';
			majorPieces[c][kingPos] = 'k';
			majorPieces[c][queenPos] = 'q';
		}
		let fen = "";
		for (let i=0; i<4; i++)
		{
			fen += majorPieces["b"][i] + minorPieces["b"][i] + "4" +
				minorPieces["w"][i].toUpperCase() + majorPieces["w"][i].toUpperCase();
			if (i < 3)
				fen += "/";
		}
		fen += " 0000"; //TODO: flags?!
		return fen;
	}
}
