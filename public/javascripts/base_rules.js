class PiPo //Piece+Position
{
	// o: {piece[p], color[c], posX[x], posY[y]}
	constructor(o)
	{
		this.p = o.p;
		this.c = o.c;
		this.x = o.x;
		this.y = o.y;
	}
}

class Move
{
	// o: {appear, vanish, [start,] [end,]}
	// appear,vanish = arrays of PiPo
	// start,end = coordinates to apply to trigger move visually (think castle)
	constructor(o)
	{
		this.appear = o.appear;
		this.vanish = o.vanish;
		this.start = !!o.start ? o.start : {x:o.vanish[0].x, y:o.vanish[0].y};
		this.end = !!o.end ? o.end : {x:o.appear[0].x, y:o.appear[0].y};
	}
}

// NOTE: x coords = top to bottom; y = left to right (from white player perspective)
class ChessRules
{
	// Path to pieces
	static getPpath(b)
	{
		return b; //usual pieces in pieces/ folder
	}
	// Turn "wb" into "B" (for FEN)
	static board2fen(b)
	{
		return b[0]=='w' ? b[1].toUpperCase() : b[1];
	}
	// Turn "p" into "bp" (for board)
	static fen2board(f)
	{
		return f.charCodeAt()<=90 ? "w"+f.toLowerCase() : "b"+f;
	}

	/////////////////
	// INITIALIZATION

	// fen == "position flags"
	constructor(fen, moves)
	{
		this.moves = moves;
		// Use fen string to initialize variables, flags and board
		this.board = VariantRules.GetBoard(fen);
		this.setFlags(fen);
		this.initVariables(fen);
	}

	initVariables(fen)
	{
		this.INIT_COL_KING = {'w':-1, 'b':-1};
		this.INIT_COL_ROOK = {'w':[-1,-1], 'b':[-1,-1]};
		this.kingPos = {'w':[-1,-1], 'b':[-1,-1]}; //respective squares of white and black king
		const fenParts = fen.split(" ");
		const position = fenParts[0].split("/");
		for (let i=0; i<position.length; i++)
		{
			let k = 0; //column index on board
			for (let j=0; j<position[i].length; j++)
			{
				switch (position[i].charAt(j))
				{
					case 'k':
						this.kingPos['b'] = [i,k];
						this.INIT_COL_KING['b'] = k;
						break;
					case 'K':
						this.kingPos['w'] = [i,k];
						this.INIT_COL_KING['w'] = k;
						break;
					case 'r':
						if (this.INIT_COL_ROOK['b'][0] < 0)
							this.INIT_COL_ROOK['b'][0] = k;
						else
							this.INIT_COL_ROOK['b'][1] = k;
						break;
					case 'R':
						if (this.INIT_COL_ROOK['w'][0] < 0)
							this.INIT_COL_ROOK['w'][0] = k;
						else
							this.INIT_COL_ROOK['w'][1] = k;
						break;
					default:
						let num = parseInt(position[i].charAt(j));
						if (!isNaN(num))
							k += (num-1);
				}
				k++;
			}
		}
		const epSq = this.moves.length > 0 ? this.getEpSquare(this.lastMove) : undefined;
		this.epSquares = [ epSq ];
	}

	// Turn diagram fen into double array ["wb","wp","bk",...]
	static GetBoard(fen)
	{
		let rows = fen.split(" ")[0].split("/");
		const [sizeX,sizeY] = VariantRules.size;
		let board = doubleArray(sizeX, sizeY, "");
		for (let i=0; i<rows.length; i++)
		{
			let j = 0;
			for (let indexInRow = 0; indexInRow < rows[i].length; indexInRow++)
			{
				let character = rows[i][indexInRow];
				let num = parseInt(character);
				if (!isNaN(num))
					j += num; //just shift j
				else //something at position i,j
					board[i][j++] = VariantRules.fen2board(character);
			}
		}
		return board;
	}

	// Overridable: flags can change a lot
	setFlags(fen)
	{
		// white a-castle, h-castle, black a-castle, h-castle
		this.castleFlags = {'w': new Array(2), 'b': new Array(2)};
		let flags = fen.split(" ")[1]; //flags right after position
		for (let i=0; i<4; i++)
			this.castleFlags[i < 2 ? 'w' : 'b'][i%2] = (flags.charAt(i) == '1');
	}

	///////////////////
	// GETTERS, SETTERS

	// Simple useful getters
	static get size() { return [8,8]; }
	// Two next functions return 'undefined' if called on empty square
	getColor(i,j) { return this.board[i][j].charAt(0); }
	getPiece(i,j) { return this.board[i][j].charAt(1); }

	// Color
	getOppCol(color) { return color=="w" ? "b" : "w"; }

	get lastMove() {
		const L = this.moves.length;
		return L>0 ? this.moves[L-1] : null;
	}
	get turn() {
		return this.moves.length%2==0 ? 'w' : 'b';
	}

	// Pieces codes
	static get PAWN() { return 'p'; }
	static get ROOK() { return 'r'; }
	static get KNIGHT() { return 'n'; }
	static get BISHOP() { return 'b'; }
	static get QUEEN() { return 'q'; }
	static get KING() { return 'k'; }

	// Empty square
	static get EMPTY() { return ''; }

	// Some pieces movements
	static get steps() {
		return {
			'r': [ [-1,0],[1,0],[0,-1],[0,1] ],
			'n': [ [-1,-2],[-1,2],[1,-2],[1,2],[-2,-1],[-2,1],[2,-1],[2,1] ],
			'b': [ [-1,-1],[-1,1],[1,-1],[1,1] ],
			'q': [ [-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1] ]
		};
	}

	// Aggregates flags into one object
	get flags() {
		return this.castleFlags;
	}

	// Reverse operation
	parseFlags(flags)
	{
		this.castleFlags = flags;
	}

	// En-passant square, if any
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

	// can thing on square1 take thing on square2
	canTake([x1,y1], [x2,y2])
	{
		return this.getColor(x1,y1) != this.getColor(x2,y2);
	}

	///////////////////
	// MOVES GENERATION

	// All possible moves from selected square (assumption: color is OK)
	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case VariantRules.PAWN:
				return this.getPotentialPawnMoves([x,y]);
			case VariantRules.ROOK:
				return this.getPotentialRookMoves([x,y]);
			case VariantRules.KNIGHT:
				return this.getPotentialKnightMoves([x,y]);
			case VariantRules.BISHOP:
				return this.getPotentialBishopMoves([x,y]);
			case VariantRules.QUEEN:
				return this.getPotentialQueenMoves([x,y]);
			case VariantRules.KING:
				return this.getPotentialKingMoves([x,y]);
		}
	}

	// Build a regular move from its initial and destination squares; tr: transformation
	getBasicMove([sx,sy], [ex,ey], tr)
	{
		let mv = new Move({
			appear: [
				new PiPo({
					x: ex,
					y: ey,
					c: !!tr ? tr.c : this.getColor(sx,sy),
					p: !!tr ? tr.p : this.getPiece(sx,sy)
				})
			],
			vanish: [
				new PiPo({
					x: sx,
					y: sy,
					c: this.getColor(sx,sy),
					p: this.getPiece(sx,sy)
				})
			]
		});

		// The opponent piece disappears if we take it
		if (this.board[ex][ey] != VariantRules.EMPTY)
		{
			mv.vanish.push(
				new PiPo({
					x: ex,
					y: ey,
					c: this.getColor(ex,ey),
					p: this.getPiece(ex,ey)
				})
			);
		}
		return mv;
	}

	// Generic method to find possible moves of non-pawn pieces ("sliding or jumping")
	getSlideNJumpMoves([x,y], steps, oneStep)
	{
		const color = this.getColor(x,y);
		let moves = [];
		const [sizeX,sizeY] = VariantRules.size;
		outerLoop:
		for (let step of steps)
		{
			let i = x + step[0];
			let j = y + step[1];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY && this.board[i][j] == VariantRules.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			if (i>=0 && i<8 && j>=0 && j<8 && this.canTake([x,y], [i,j]))
				moves.push(this.getBasicMove([x,y], [i,j]));
		}
		return moves;
	}

	// What are the pawn moves from square x,y considering color "color" ?
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

	// What are the rook moves from square x,y ?
	getPotentialRookMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.ROOK]);
	}

	// What are the knight moves from square x,y ?
	getPotentialKnightMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.KNIGHT], "oneStep");
	}

	// What are the bishop moves from square x,y ?
	getPotentialBishopMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.BISHOP]);
	}

	// What are the queen moves from square x,y ?
	getPotentialQueenMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.QUEEN]);
	}

	// What are the king moves from square x,y ?
	getPotentialKingMoves(sq)
	{
		// Initialize with normal moves
		let moves = this.getSlideNJumpMoves(sq, VariantRules.steps[VariantRules.QUEEN], "oneStep");
		return moves.concat(this.getCastleMoves(sq));
	}

	getCastleMoves([x,y])
	{
		const c = this.getColor(x,y);
		if (x != (c=="w" ? 7 : 0) || y != this.INIT_COL_KING[c])
			return []; //x isn't first rank, or king has moved (shortcut)

		const V = VariantRules;

		// Castling ?
		const oppCol = this.getOppCol(c);
		let moves = [];
		let i = 0;
		const finalSquares = [ [2,3], [6,5] ]; //king, then rook
		castlingCheck:
		for (let castleSide=0; castleSide < 2; castleSide++) //large, then small
		{
			if (!this.castleFlags[c][castleSide])
				continue;
			// If this code is reached, rooks and king are on initial position

			// Nothing on the path of the king (and no checks; OK also if y==finalSquare)?
			let step = finalSquares[castleSide][0] < y ? -1 : 1;
			for (i=y; i!=finalSquares[castleSide][0]; i+=step)
			{
				if (this.isAttacked([x,i], oppCol) || (this.board[x][i] != V.EMPTY &&
					// NOTE: next check is enough, because of chessboard constraints
					(this.getColor(x,i) != c || ![V.KING,V.ROOK].includes(this.getPiece(x,i)))))
				{
					continue castlingCheck;
				}
			}

			// Nothing on the path to the rook?
			step = castleSide == 0 ? -1 : 1;
			for (i = y + step; i != this.INIT_COL_ROOK[c][castleSide]; i += step)
			{
				if (this.board[x][i] != V.EMPTY)
					continue castlingCheck;
			}
			const rookPos = this.INIT_COL_ROOK[c][castleSide];

			// Nothing on final squares, except maybe king and castling rook?
			for (i=0; i<2; i++)
			{
				if (this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
					this.getPiece(x,finalSquares[castleSide][i]) != V.KING &&
					finalSquares[castleSide][i] != rookPos)
				{
					continue castlingCheck;
				}
			}

			// If this code is reached, castle is valid
			moves.push( new Move({
				appear: [
					new PiPo({x:x,y:finalSquares[castleSide][0],p:V.KING,c:c}),
					new PiPo({x:x,y:finalSquares[castleSide][1],p:V.ROOK,c:c})],
				vanish: [
					new PiPo({x:x,y:y,p:V.KING,c:c}),
					new PiPo({x:x,y:rookPos,p:V.ROOK,c:c})],
				end: Math.abs(y - rookPos) <= 2
					? {x:x, y:rookPos}
					: {x:x, y:y + 2 * (castleSide==0 ? -1 : 1)}
			}) );
		}

		return moves;
	}

	///////////////////
	// MOVES VALIDATION

	canIplay(side, [x,y])
	{
		return ((side=='w' && this.moves.length%2==0) || (side=='b' && this.moves.length%2==1))
			&& this.getColor(x,y) == side;
	}

	getPossibleMovesFrom(sq)
	{
		// Assuming color is right (already checked)
		return this.filterValid( this.getPotentialMovesFrom(sq) );
	}

	// TODO: once a promotion is filtered, the others results are same: useless computations
	filterValid(moves)
	{
		if (moves.length == 0)
			return [];
		let color = this.turn;
		return moves.filter(m => { return !this.underCheck(m, color); });
	}

	// Search for all valid moves considering current turn (for engine and game end)
	getAllValidMoves()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		var potentialMoves = [];
		let [sizeX,sizeY] = VariantRules.size;
		for (var i=0; i<sizeX; i++)
		{
			for (var j=0; j<sizeY; j++)
			{
				// Next condition ... != oppCol is a little HACK to work with checkered variant
				if (this.board[i][j] != VariantRules.EMPTY && this.getColor(i,j) != oppCol)
					Array.prototype.push.apply(potentialMoves, this.getPotentialMovesFrom([i,j]));
			}
		}
		// NOTE: prefer lazy undercheck tests, letting the king being taken?
		// No: if happen on last 1/2 move, could lead to forbidden moves, wrong evals
		return this.filterValid(potentialMoves);
	}

	// Stop at the first move found
	atLeastOneMove()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		let [sizeX,sizeY] = VariantRules.size;
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY && this.getColor(i,j) != oppCol)
				{
					const moves = this.getPotentialMovesFrom([i,j]);
					if (moves.length > 0)
					{
						for (let k=0; k<moves.length; k++)
						{
							if (this.filterValid([moves[k]]).length > 0)
								return true;
						}
					}
				}
			}
		}
		return false;
	}

	// Check if pieces of color 'colors' are attacking square x,y
	isAttacked(sq, colors)
	{
		return (this.isAttackedByPawn(sq, colors)
			|| this.isAttackedByRook(sq, colors)
			|| this.isAttackedByKnight(sq, colors)
			|| this.isAttackedByBishop(sq, colors)
			|| this.isAttackedByQueen(sq, colors)
			|| this.isAttackedByKing(sq, colors));
	}

	// Is square x,y attacked by pawns of color c ?
	isAttackedByPawn([x,y], colors)
	{
		for (let c of colors)
		{
			let pawnShift = (c=="w" ? 1 : -1);
			if (x+pawnShift>=0 && x+pawnShift<8)
			{
				for (let i of [-1,1])
				{
					if (y+i>=0 && y+i<8 && this.getPiece(x+pawnShift,y+i)==VariantRules.PAWN
						&& this.getColor(x+pawnShift,y+i)==c)
					{
						return true;
					}
				}
			}
		}
		return false;
	}

	// Is square x,y attacked by rooks of color c ?
	isAttackedByRook(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			VariantRules.ROOK, VariantRules.steps[VariantRules.ROOK]);
	}

	// Is square x,y attacked by knights of color c ?
	isAttackedByKnight(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			VariantRules.KNIGHT, VariantRules.steps[VariantRules.KNIGHT], "oneStep");
	}

	// Is square x,y attacked by bishops of color c ?
	isAttackedByBishop(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			VariantRules.BISHOP, VariantRules.steps[VariantRules.BISHOP]);
	}

	// Is square x,y attacked by queens of color c ?
	isAttackedByQueen(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			VariantRules.QUEEN, VariantRules.steps[VariantRules.QUEEN]);
	}

	// Is square x,y attacked by king of color c ?
	isAttackedByKing(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			VariantRules.KING, VariantRules.steps[VariantRules.QUEEN], "oneStep");
	}

	// Generic method for non-pawn pieces ("sliding or jumping"): is x,y attacked by piece != color ?
	isAttackedBySlideNJump([x,y], colors, piece, steps, oneStep)
	{
		for (let step of steps)
		{
			let rx = x+step[0], ry = y+step[1];
			while (rx>=0 && rx<8 && ry>=0 && ry<8 && this.board[rx][ry] == VariantRules.EMPTY
				&& !oneStep)
			{
				rx += step[0];
				ry += step[1];
			}
			if (rx>=0 && rx<8 && ry>=0 && ry<8 && this.board[rx][ry] != VariantRules.EMPTY
				&& this.getPiece(rx,ry) == piece && colors.includes(this.getColor(rx,ry)))
			{
				return true;
			}
		}
		return false;
	}

	// Is color c under check after move ?
	underCheck(move)
	{
		const color = this.turn;
		this.play(move);
		let res = this.isAttacked(this.kingPos[color], this.getOppCol(color));
		this.undo(move);
		return res;
	}

	// On which squares is color c under check (after move) ?
	getCheckSquares(move)
	{
		this.play(move);
		const color = this.turn; //opponent
		let res = this.isAttacked(this.kingPos[color], this.getOppCol(color))
			? [ JSON.parse(JSON.stringify(this.kingPos[color])) ] //need to duplicate!
			: [ ];
		this.undo(move);
		return res;
	}

	// Apply a move on board
	static PlayOnBoard(board, move)
	{
		for (let psq of move.vanish)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.appear)
			board[psq.x][psq.y] = psq.c + psq.p;
	}
	// Un-apply the played move
	static UndoOnBoard(board, move)
	{
		for (let psq of move.appear)
			board[psq.x][psq.y] = VariantRules.EMPTY;
		for (let psq of move.vanish)
			board[psq.x][psq.y] = psq.c + psq.p;
	}

	// Before move is played, update variables + flags
	updateVariables(move)
	{
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		const firstRank = (c == "w" ? 7 : 0);

		// Update king position + flags
		if (piece == VariantRules.KING && move.appear.length > 0)
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
			this.castleFlags[c] = [false,false];
			return;
		}
		const oppCol = this.getOppCol(c);
		const oppFirstRank = 7 - firstRank;
		if (move.start.x == firstRank //our rook moves?
			&& this.INIT_COL_ROOK[c].includes(move.start.y))
		{
			const flagIdx = (move.start.y == this.INIT_COL_ROOK[c][0] ? 0 : 1);
			this.castleFlags[c][flagIdx] = false;
		}
		else if (move.end.x == oppFirstRank //we took opponent rook?
			&& this.INIT_COL_ROOK[oppCol].includes(move.end.y))
		{
			const flagIdx = (move.end.y == this.INIT_COL_ROOK[oppCol][0] ? 0 : 1);
			this.castleFlags[oppCol][flagIdx] = false;
		}
	}

	unupdateVariables(move)
	{
		// (Potentially) Reset king position
		const c = this.getColor(move.start.x,move.start.y);
		if (this.getPiece(move.start.x,move.start.y) == VariantRules.KING)
			this.kingPos[c] = [move.start.x, move.start.y];
	}

	play(move, ingame)
	{
		if (!!ingame)
			move.notation = this.getNotation(move);

		move.flags = JSON.stringify(this.flags); //save flags (for undo)
		this.updateVariables(move);
		this.moves.push(move);
		this.epSquares.push( this.getEpSquare(move) );
		VariantRules.PlayOnBoard(this.board, move);
	}

	undo(move)
	{
		VariantRules.UndoOnBoard(this.board, move);
		this.epSquares.pop();
		this.moves.pop();
		this.unupdateVariables(move);
		this.parseFlags(JSON.parse(move.flags));
	}

	//////////////
	// END OF GAME

	checkRepetition()
	{
		// Check for 3 repetitions
		if (this.moves.length >= 8)
		{
			// NOTE: crude detection, only moves repetition
			const L = this.moves.length;
			if (_.isEqual(this.moves[L-1], this.moves[L-5]) &&
				_.isEqual(this.moves[L-2], this.moves[L-6]) &&
				_.isEqual(this.moves[L-3], this.moves[L-7]) &&
				_.isEqual(this.moves[L-4], this.moves[L-8]))
			{
				return true;
			}
		}
		return false;
	}

	checkGameOver()
	{
		if (this.checkRepetition())
			return "1/2";

		if (this.atLeastOneMove()) // game not over
			return "*";

		// Game over
		return this.checkGameEnd();
	}

	// No moves are possible: compute score
	checkGameEnd()
	{
		const color = this.turn;
		// No valid move: stalemate or checkmate?
		if (!this.isAttacked(this.kingPos[color], this.getOppCol(color)))
			return "1/2";
		// OK, checkmate
		return color == "w" ? "0-1" : "1-0";
	}

	////////
	//ENGINE

	// Pieces values
	static get VALUES() {
		return {
			'p': 1,
			'r': 5,
			'n': 3,
			'b': 3,
			'q': 9,
			'k': 1000
		};
	}

	// Assumption: at least one legal move
	getComputerMove()
	{
		const color = this.turn;
		let moves1 = this.getAllValidMoves();

		// Rank moves using a min-max at depth 2
		for (let i=0; i<moves1.length; i++)
		{
			moves1[i].eval = (color=="w" ? -1 : 1) * 1000; //very low, I'm checkmated
			let eval2 = (color=="w" ? 1 : -1) * 1000; //initialized with very high (checkmate) value
			this.play(moves1[i]);
			// Second half-move:
			let moves2 = this.getAllValidMoves();
			// If no possible moves AND underCheck, eval2 is correct.
			// If !underCheck, eval2 is 0 (stalemate).
			if (moves2.length == 0 && this.checkGameEnd() == "1/2")
				eval2 = 0;
			for (let j=0; j<moves2.length; j++)
			{
				this.play(moves2[j]);
				let evalPos = this.evalPosition();
				if ((color == "w" && evalPos < eval2) || (color=="b" && evalPos > eval2))
					eval2 = evalPos;
				this.undo(moves2[j]);
			}
			if ((color=="w" && eval2 > moves1[i].eval) || (color=="b" && eval2 < moves1[i].eval))
				moves1[i].eval = eval2;
			this.undo(moves1[i]);
		}
		moves1.sort( (a,b) => { return (color=="w" ? 1 : -1) * (b.eval - a.eval); });

		// TODO: show current analyzed move for depth 3, allow stopping eval (return moves1[0])
		for (let i=0; i<moves1.length; i++)
		{
			this.play(moves1[i]);
			// 0.1 * oldEval : heuristic to avoid some bad moves (not all...)
			moves1[i].eval = 0.1*moves1[i].eval + this.alphabeta(2, -1000, 1000);
			this.undo(moves1[i]);
		}
		moves1.sort( (a,b) => { return (color=="w" ? 1 : -1) * (b.eval - a.eval); });

		let candidates = [0]; //indices of candidates moves
		for (let j=1; j<moves1.length && moves1[j].eval == moves1[0].eval; j++)
			candidates.push(j);

//		console.log(moves1.map(m => { return [this.getNotation(m), m.eval]; }));
		return moves1[_.sample(candidates, 1)];
	}

	alphabeta(depth, alpha, beta)
  {
		const color = this.turn;
		if (!this.atLeastOneMove())
		{
			switch (this.checkGameEnd())
			{
				case "1/2": return 0;
				default: return color=="w" ? -1000 : 1000;
			}
		}
		if (depth == 0)
      return this.evalPosition();
		const moves = this.getAllValidMoves();
    let v = color=="w" ? -1000 : 1000;
		if (color == "w")
		{
			for (let i=0; i<moves.length; i++)
      {
				this.play(moves[i]);
				v = Math.max(v, this.alphabeta(depth-1, alpha, beta));
				this.undo(moves[i]);
				alpha = Math.max(alpha, v);
				if (alpha >= beta)
					break; //beta cutoff
			}
		}
		else //color=="b"
		{
			for (let i=0; i<moves.length; i++)
			{
				this.play(moves[i]);
				v = Math.min(v, this.alphabeta(depth-1, alpha, beta));
				this.undo(moves[i]);
				beta = Math.min(beta, v);
				if (alpha >= beta)
					break; //alpha cutoff
			}
		}
		return v;
	}

	evalPosition()
	{
		const [sizeX,sizeY] = VariantRules.size;
		let evaluation = 0;
		//Just count material for now
		for (let i=0; i<sizeX; i++)
		{
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] != VariantRules.EMPTY)
				{
					const sign = this.getColor(i,j) == "w" ? 1 : -1;
					evaluation += sign * VariantRules.VALUES[this.getPiece(i,j)];
				}
			}
		}
		return evaluation;
	}

	////////////
	// FEN utils

	// Overridable..
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

	// Return current fen according to pieces+colors state
	getFen()
	{
		return this.getBaseFen() + " " + this.getFlagsFen();
	}

	getBaseFen()
	{
		let fen = "";
		let [sizeX,sizeY] = VariantRules.size;
		for (let i=0; i<sizeX; i++)
		{
			let emptyCount = 0;
			for (let j=0; j<sizeY; j++)
			{
				if (this.board[i][j] == VariantRules.EMPTY)
					emptyCount++;
				else
				{
					if (emptyCount > 0)
					{
						// Add empty squares in-between
						fen += emptyCount;
						emptyCount = 0;
					}
					fen += VariantRules.board2fen(this.board[i][j]);
				}
			}
			if (emptyCount > 0)
			{
				// "Flush remainder"
				fen += emptyCount;
			}
			if (i < sizeX - 1)
				fen += "/"; //separate rows
		}
		return fen;
	}

	// Overridable..
	getFlagsFen()
	{
		let fen = "";
		// Add castling flags
		for (let i of ['w','b'])
		{
			for (let j=0; j<2; j++)
				fen += this.castleFlags[i][j] ? '1' : '0';
		}
		return fen;
	}

	// Context: just before move is played, turn hasn't changed
	getNotation(move)
	{
		if (move.appear.length == 2 && move.appear[0].p == VariantRules.KING)
		{
			// Castle
			if (move.end.y < move.start.y)
				return "0-0-0";
			else
				return "0-0";
		}

		// Translate final square
		const finalSquare =
			String.fromCharCode(97 + move.end.y) + (VariantRules.size[0]-move.end.x);

		const piece = this.getPiece(move.start.x, move.start.y);
		if (piece == VariantRules.PAWN)
		{
			// Pawn move
			let notation = "";
			if (move.vanish.length > move.appear.length)
			{
				// Capture
				const startColumn = String.fromCharCode(97 + move.start.y);
				notation = startColumn + "x" + finalSquare;
			}
			else //no capture
				notation = finalSquare;
			if (move.appear.length > 0 && piece != move.appear[0].p) //promotion
				notation += "=" + move.appear[0].p.toUpperCase();
			return notation;
		}

		else
		{
			// Piece movement
			return piece.toUpperCase() +
				(move.vanish.length > move.appear.length ? "x" : "") + finalSquare;
		}
	}

	// The score is already computed when calling this function
	getPGN(mycolor, score, fenStart, mode)
	{
		let pgn = "";
		pgn += '[Site "vchess.club"]<br>';
		const d = new Date();
		const opponent = mode=="human" ? "Anonymous" : "Computer";
		pgn += '[Variant "' + variant + '"]<br>';
		pgn += '[Date "' + d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + '"]<br>';
		pgn += '[White "' + (mycolor=='w'?'Myself':opponent) + '"]<br>';
		pgn += '[Black "' + (mycolor=='b'?'Myself':opponent) + '"]<br>';
		pgn += '[Fen "' + fenStart + '"]<br>';
		pgn += '[Result "' + score + '"]<br><br>';

		for (let i=0; i<this.moves.length; i++)
		{
			if (i % 2 == 0)
				pgn += ((i/2)+1) + ".";
			pgn += this.moves[i].notation + " ";
		}

		pgn += score;
		return pgn;
	}
}
