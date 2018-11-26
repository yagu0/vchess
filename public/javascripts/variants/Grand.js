//https://www.chessvariants.com/large.dir/freeling.html
class GrandRules extends ChessRules
{
	static getPpath(b)
	{
		const V = VariantRules;
		return ([V.CAMEL,V.WILDEBEEST].includes(b[1]) ? "Grand/" : "") + b;
	}

	static get MARSHALL() { return 'm'; } //rook+knight
	static get CARDINAL() { return 'c'; } //bishop+knight

	// ------> pas les règles exactes, on démarre en 2 avec 1,2 ou 3 cases + enPassant comme Wildebeest
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
			case VariantRules.MARSHALL:
				return this.getPotentialMarshallMoves([x,y]);
			case VariantRules.CARDINAL:
				return this.getPotentialCardinalMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y])
		}
	}

	// TODO: quite many changes! Especially promotions, only to friendly pieces already captured. ==> keep track of captured material in initVariables()......
	getPotentialPawnMoves([x,y])
	{
	}

	getPotentialMarshallMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
			this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"));
	}

	getPotentialCardinalMoves(sq)
	{
		const V = VariantRules;
		return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
			this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"));
	}

	isAttacked(sq, colors)
	{
		return (super.isAttacked(sq, colors)
			|| this.isAttackedByMarshall(sq, colors)
			|| this.isAttackedByCardinal(sq, colors);
	}

	isAttackedByMarshall(sq, colors)
	{
		const V = VariantRules;
		return this.isAttackedBySlideNJump(sq, colors, V.MARSHALL, V.steps[V.ROOK])
			|| this.isAttackedBySlideNJump(sq, colors, V.MARSHALL, V.steps[V.KNIGHT], "oneStep");
	}

	isAttackedByCardinal(sq, colors)
	{
		const V = VariantRules;
		return this.isAttackedBySlideNJump(sq, colors, V.CARDINAL, V.steps[V.BISHOP])
			|| this.isAttackedBySlideNJump(sq, colors, V.CARDINAL, V.steps[V.KNIGHT], "oneStep");
	}

	static get VALUES() {
		return Object.assign(
			ChessRules.VALUES,
			{'c': 5, 'm': 7} //experimental
		);
	}

	// TODO:
	static GenRandInitFen()
	{
	}
}
