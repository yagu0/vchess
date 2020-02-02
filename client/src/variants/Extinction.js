import { ChessRules } from "@/base_rules";

export const VariantRules = class  ExtinctionRules extends ChessRules
{
	setOtherVariables(fen)
	{
		super.setOtherVariables(fen);
		const pos = V.ParseFen(fen).position;
		// NOTE: no need for safety "|| []", because each piece type must be present
		// (otherwise game is already over!)
		this.material =
		{
			"w":
			{
				[V.KING]: pos.match(/K/g).length,
				[V.QUEEN]: pos.match(/Q/g).length,
				[V.ROOK]: pos.match(/R/g).length,
				[V.KNIGHT]: pos.match(/N/g).length,
				[V.BISHOP]: pos.match(/B/g).length,
				[V.PAWN]: pos.match(/P/g).length
			},
			"b":
			{
				[V.KING]: pos.match(/k/g).length,
				[V.QUEEN]: pos.match(/q/g).length,
				[V.ROOK]: pos.match(/r/g).length,
				[V.KNIGHT]: pos.match(/n/g).length,
				[V.BISHOP]: pos.match(/b/g).length,
				[V.PAWN]: pos.match(/p/g).length
			}
		};
	}

	getPotentialPawnMoves([x,y])
	{
		let moves = super.getPotentialPawnMoves([x,y]);
		// Add potential promotions into king
		const color = this.turn;
		const shift = (color == "w" ? -1 : 1);
		const lastRank = (color == "w" ? 0 : V.size.x-1);

		if (x+shift == lastRank)
		{
			// Normal move
			if (this.board[x+shift][y] == V.EMPTY)
				moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:V.KING}));
			// Captures
			if (y>0 && this.board[x+shift][y-1] != V.EMPTY
				&& this.canTake([x,y], [x+shift,y-1]))
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y-1], {c:color,p:V.KING}));
			}
			if (y<V.size.y-1 && this.board[x+shift][y+1] != V.EMPTY
				&& this.canTake([x,y], [x+shift,y+1]))
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y+1], {c:color,p:V.KING}));
			}
		}

		return moves;
	}

	// TODO: verify this assertion
	atLeastOneMove()
	{
		return true; //always at least one possible move
	}

	underCheck(color)
	{
		return false; //there is no check
	}

	getCheckSquares(color)
	{
		return [];
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		// Treat the promotion case: (not the capture part)
		if (move.appear[0].p != move.vanish[0].p)
		{
			this.material[move.appear[0].c][move.appear[0].p]++;
			this.material[move.appear[0].c][V.PAWN]--;
		}
		if (move.vanish.length==2 && move.appear.length==1) //capture
			this.material[move.vanish[1].c][move.vanish[1].p]--;
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		if (move.appear[0].p != move.vanish[0].p)
		{
			this.material[move.appear[0].c][move.appear[0].p]--;
			this.material[move.appear[0].c][V.PAWN]++;
		}
		if (move.vanish.length==2 && move.appear.length==1)
			this.material[move.vanish[1].c][move.vanish[1].p]++;
	}

	getCurrentScore()
	{
		if (this.atLeastOneMove()) // game not over?
		{
			const color = this.turn;
			if (Object.keys(this.material[color]).some(
				p => { return this.material[color][p] == 0; }))
			{
				return (this.turn == "w" ? "0-1" : "1-0");
			}
			return "*";
		}

		return (this.turn == "w" ? "0-1" : "1-0"); //NOTE: currently unreachable...
	}

	evalPosition()
	{
		const color = this.turn;
		if (Object.keys(this.material[color]).some(
			p => { return this.material[color][p] == 0; }))
		{
			// Very negative (resp. positive) if white (reps. black) pieces set is incomplete
			return (color=="w"?-1:1) * V.INFINITY;
		}
		return super.evalPosition();
	}
}
