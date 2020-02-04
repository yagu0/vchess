import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export const VariantRules = class MarseilleRules extends ChessRules
{
	static IsGoodEnpassant(enpassant)
	{
		if (enpassant != "-")
		{
			const squares = enpassant.split(",");
			if (squares.length > 2)
				return false;
			for (let sq of squares)
			{
				const ep = V.SquareToCoords(sq);
				if (isNaN(ep.x) || !V.OnBoard(ep))
					return false;
			}
		}
		return true;
	}

	getTurnFen()
	{
		return this.turn + this.subTurn;
	}

	// There may be 2 enPassant squares (if 2 pawns jump 2 squares in same turn)
	getEnpassantFen()
	{
		const L = this.epSquares.length;
		if (this.epSquares[L-1].every(epsq => epsq === undefined))
			return "-"; //no en-passant
		let res = "";
		this.epSquares[L-1].forEach(epsq => {
			if (!!epsq)
				res += V.CoordsToSquare(epsq) + ",";
		});
		return res.slice(0,-1); //remove last comma
	}

	setOtherVariables(fen)
	{
		const parsedFen = V.ParseFen(fen);
		this.setFlags(parsedFen.flags);
		if (parsedFen.enpassant == "-")
			this.epSquares = [ [undefined] ];
		else
		{
			let res = [];
			const squares = parsedFen.enpassant.split(",");
			for (let sq of squares)
				res.push(V.SquareToCoords(sq));
			this.epSquares = [ res ];
		}
		this.scanKingsRooks(fen);
		// Extract subTurn from turn indicator: "w" (first move), or
		// "w1" or "w2" white subturn 1 or 2, and same for black
		const fullTurn = V.ParseFen(fen).turn;
		this.turn = fullTurn[0];
		this.subTurn = (fullTurn[1] || 0); //"w0" = special code for first move in game
	}

	getPotentialPawnMoves([x,y])
	{
		const color = this.turn;
		let moves = [];
		const [sizeX,sizeY] = [V.size.x,V.size.y];
		const shiftX = (color == "w" ? -1 : 1);
		const firstRank = (color == 'w' ? sizeX-1 : 0);
		const startRank = (color == "w" ? sizeX-2 : 1);
		const lastRank = (color == "w" ? 0 : sizeX-1);
		const finalPieces = x + shiftX == lastRank
			? [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN]
			: [V.PAWN];

		// One square forward
		if (this.board[x+shiftX][y] == V.EMPTY)
		{
			for (let piece of finalPieces)
			{
				moves.push(this.getBasicMove([x,y], [x+shiftX,y],
					{c:color,p:piece}));
			}
			// Next condition because pawns on 1st rank can generally jump
			if ([startRank,firstRank].includes(x)
				&& this.board[x+2*shiftX][y] == V.EMPTY)
			{
				// Two squares jump
				moves.push(this.getBasicMove([x,y], [x+2*shiftX,y]));
			}
		}
		// Captures
		for (let shiftY of [-1,1])
		{
			if (y + shiftY >= 0 && y + shiftY < sizeY
				&& this.board[x+shiftX][y+shiftY] != V.EMPTY
				&& this.canTake([x,y], [x+shiftX,y+shiftY]))
			{
				for (let piece of finalPieces)
				{
					moves.push(this.getBasicMove([x,y], [x+shiftX,y+shiftY],
						{c:color,p:piece}));
				}
			}
		}

		// En passant: always OK if subturn 1,
		// OK on subturn 2 only if enPassant was played at subturn 1
		// (and if there are two e.p. squares available).
		const Lep = this.epSquares.length;
		const epSquares = this.epSquares[Lep-1]; //always at least one element
		let epSqs = [];
		epSquares.forEach(sq => {
			if (!!sq)
				epSqs.push(sq);
		});
		if (epSqs.length == 0)
			return moves;
		const oppCol = V.GetOppCol(color);
		for (let sq of epSqs)
		{
			if (this.subTurn == 1 || (epSqs.length == 2 &&
				// Was this en-passant capture already played at subturn 1 ?
				// (Or maybe the opponent filled the en-passant square with a piece)
				this.board[epSqs[0].x][epSqs[0].y] != V.EMPTY))
			{
				if (sq.x == x+shiftX && Math.abs(sq.y - y) == 1
					// Add condition "enemy pawn must be present"
					&& this.getPiece(x,sq.y) == V.PAWN && this.getColor(x,sq.y) == oppCol)
				{
					let epMove = this.getBasicMove([x,y], [sq.x,sq.y]);
					epMove.vanish.push({
						x: x,
						y: sq.y,
						p: 'p',
						c: oppCol
					});
					moves.push(epMove);
				}
			}
		}

		return moves;
	}

	play(move)
	{
		move.flags = JSON.stringify(this.aggregateFlags());
		move.turn = this.turn + this.subTurn;
		V.PlayOnBoard(this.board, move);
		const epSq = this.getEpSquare(move);
		if (this.subTurn == 0) //first move in game
		{
			this.turn = "b";
      this.subTurn = 1;
			this.epSquares.push([epSq]);
		}
		// Does this move give check on subturn 1? If yes, skip subturn 2
		else if (this.subTurn==1 && this.underCheck(V.GetOppCol(this.turn)))
		{
			this.turn = V.GetOppCol(this.turn);
			this.epSquares.push([epSq]);
			move.checkOnSubturn1 = true;
		}
		else
		{
			if (this.subTurn == 2)
			{
				this.turn = V.GetOppCol(this.turn);
				let lastEpsq = this.epSquares[this.epSquares.length-1];
				lastEpsq.push(epSq);
			}
			else
				this.epSquares.push([epSq]);
			this.subTurn = 3 - this.subTurn;
		}
		this.updateVariables(move);
	}

	undo(move)
	{
		this.disaggregateFlags(JSON.parse(move.flags));
		V.UndoOnBoard(this.board, move);
		if (move.turn[1] == '0' || move.checkOnSubturn1 || this.subTurn == 2)
			this.epSquares.pop();
		else //this.subTurn == 1
		{
			let lastEpsq = this.epSquares[this.epSquares.length-1];
			lastEpsq.pop();
		}
		this.turn = move.turn[0];
		this.subTurn = parseInt(move.turn[1]);
		this.unupdateVariables(move);
	}

	// NOTE:  GenRandInitFen() is OK,
	// since at first move turn indicator is just "w"

	static get VALUES()
	{
		return {
			'p': 1,
			'r': 5,
			'n': 3,
			'b': 3,
			'q': 7, //slightly less than in orthodox game
			'k': 1000
		};
	}

	// No alpha-beta here, just adapted min-max at depth 2(+1)
	getComputerMove()
	{
		if (this.subTurn == 2)
			return null; //TODO: imperfect interface setup

		const maxeval = V.INFINITY;
		const color = this.turn;
		const oppCol = V.GetOppCol(this.turn);

		// Search best (half) move for opponent turn
		const getBestMoveEval = () => {
			const turnBefore = this.turn + this.subTurn;
			let score = this.getCurrentScore();
			if (score != "*")
			{
				if (score == "1/2")
					return 0;
				return maxeval * (score == "1-0" ? 1 : -1);
			}
			let moves = this.getAllValidMoves();
			let res = (oppCol == "w" ? -maxeval : maxeval);
			for (let m of moves)
			{
				this.play(m);
				score = this.getCurrentScore();
				// Now turn is oppCol,2 if m doesn't give check
				// Otherwise it's color,1. In both cases the next test makes sense
				if (score != "*")
				{
					if (score == "1/2")
						res = (oppCol == "w" ? Math.max(res, 0) : Math.min(res, 0));
					else
					{
						// Found a mate
						this.undo(m);
						return maxeval * (score == "1-0" ? 1 : -1);
					}
				}
				const evalPos = this.evalPosition();
				res = (oppCol == "w" ? Math.max(res, evalPos) : Math.min(res, evalPos));
				this.undo(m);
			}
			return res;
		};

		let moves11 = this.getAllValidMoves();
		let doubleMoves = [];
		// Rank moves using a min-max at depth 2
		for (let i=0; i<moves11.length; i++)
		{
			this.play(moves11[i]);
			if (this.turn != color)
			{
				// We gave check with last move: search the best opponent move
				doubleMoves.push({moves:[moves11[i]], eval:getBestMoveEval()});
			}
			else
			{
				let moves12 = this.getAllValidMoves();
				for (let j=0; j<moves12.length; j++)
				{
					this.play(moves12[j]);
					doubleMoves.push({
						moves:[moves11[i],moves12[j]],
						eval:getBestMoveEval()});
					this.undo(moves12[j]);
				}
			}
			this.undo(moves11[i]);
		}

		doubleMoves.sort( (a,b) => {
			return (color=="w" ? 1 : -1) * (b.eval - a.eval); });
		let candidates = [0]; //indices of candidates moves
		for (let i=1;
			i<doubleMoves.length && doubleMoves[i].eval == doubleMoves[0].eval;
			i++)
		{
			candidates.push(i);
		}

		const selected = doubleMoves[randInt(candidates.length)].moves;
		if (selected.length == 1)
			return selected[0];
		return selected;
	}
}
