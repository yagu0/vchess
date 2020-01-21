class BaroqueRules extends ChessRules
{
	static get HasFlags() { return false; }

	static get HasEnpassant() { return false; }

	static getPpath(b)
	{
		if (b[1] == "m") //'m' for Immobilizer (I is too similar to 1)
			return "Baroque/" + b;
		return b; //usual piece
	}

	static get PIECES()
	{
		return ChessRules.PIECES.concat([V.IMMOBILIZER]);
	}

	// No castling, but checks, so keep track of kings
	setOtherVariables(fen)
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
	}

	static get IMMOBILIZER() { return 'm'; }
	// Although other pieces keep their names here for coding simplicity,
	// keep in mind that:
	//  - a "rook" is a coordinator, capturing by coordinating with the king
	//  - a "knight" is a long-leaper, capturing as in draughts
	//  - a "bishop" is a chameleon, capturing as its prey
	//  - a "queen" is a withdrawer, capturing by moving away from pieces

	// Is piece on square (x,y) immobilized?
	isImmobilized([x,y])
	{
		const piece = this.getPiece(x,y);
		const color = this.getColor(x,y);
		const oppCol = V.GetOppCol(color);
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		outerLoop:
		for (let step of adjacentSteps)
		{
			const [i,j] = [x+step[0],y+step[1]];
			if (V.OnBoard(i,j) && this.board[i][j] != V.EMPTY
				&& this.getColor(i,j) == oppCol)
			{
				const oppPiece = this.getPiece(i,j);
				if (oppPiece == V.IMMOBILIZER)
				{
					// Moving is impossible only if this immobilizer is not neutralized
					for (let step2 of adjacentSteps)
					{
						const [i2,j2] = [i+step2[0],j+step2[1]];
						if (i2 == x && j2 == y)
							continue; //skip initial piece!
						if (V.OnBoard(i2,j2) && this.board[i2][j2] != V.EMPTY
							&& this.getColor(i2,j2) == color)
						{
							if ([V.BISHOP,V.IMMOBILIZER].includes(this.getPiece(i2,j2)))
								return false;
						}
					}
					return true; //immobilizer isn't neutralized
				}
				// Chameleons can't be immobilized twice, because there is only one immobilizer
				if (oppPiece == V.BISHOP && piece == V.IMMOBILIZER)
					return true;
			}
		}
		return false;
	}

	getPotentialMovesFrom([x,y])
	{
		// Pre-check: is thing on this square immobilized?
		if (this.isImmobilized([x,y]))
			return [];
		switch (this.getPiece(x,y))
		{
			case V.IMMOBILIZER:
				return this.getPotentialImmobilizerMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y]);
		}
	}

	getSlideNJumpMoves([x,y], steps, oneStep)
	{
		const color = this.getColor(x,y);
		const piece = this.getPiece(x,y);
		let moves = [];
		outerLoop:
		for (let step of steps)
		{
			let i = x + step[0];
			let j = y + step[1];
			while (V.OnBoard(i,j) && this.board[i][j] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [i,j]));
				if (oneStep !== undefined)
					continue outerLoop;
				i += step[0];
				j += step[1];
			}
			// Only king can take on occupied square:
			if (piece==V.KING && V.OnBoard(i,j) && this.canTake([x,y], [i,j]))
				moves.push(this.getBasicMove([x,y], [i,j]));
		}
		return moves;
	}

	// Modify capturing moves among listed pawn moves
	addPawnCaptures(moves, byChameleon)
	{
		const steps = V.steps[V.ROOK];
		const color = this.turn;
		const oppCol = V.GetOppCol(color);
		moves.forEach(m => {
			if (!!byChameleon && m.start.x!=m.end.x && m.start.y!=m.end.y)
				return; //chameleon not moving as pawn
			// Try capturing in every direction
			for (let step of steps)
			{
				const sq2 = [m.end.x+2*step[0],m.end.y+2*step[1]];
				if (V.OnBoard(sq2[0],sq2[1]) && this.board[sq2[0]][sq2[1]] != V.EMPTY
					&& this.getColor(sq2[0],sq2[1]) == color)
				{
					// Potential capture
					const sq1 = [m.end.x+step[0],m.end.y+step[1]];
					if (this.board[sq1[0]][sq1[1]] != V.EMPTY
						&& this.getColor(sq1[0],sq1[1]) == oppCol)
					{
						const piece1 = this.getPiece(sq1[0],sq1[1]);
						if (!byChameleon || piece1 == V.PAWN)
						{
							m.vanish.push(new PiPo({
								x:sq1[0],
								y:sq1[1],
								c:oppCol,
								p:piece1
							}));
						}
					}
				}
			}
		});
	}

	// "Pincer"
	getPotentialPawnMoves([x,y])
	{
		let moves = super.getPotentialRookMoves([x,y]);
		this.addPawnCaptures(moves);
		return moves;
	}

	addRookCaptures(moves, byChameleon)
	{
		const color = this.turn;
		const oppCol = V.GetOppCol(color);
		const kp = this.kingPos[color];
		moves.forEach(m => {
			// Check piece-king rectangle (if any) corners for enemy pieces
			if (m.end.x == kp[0] || m.end.y == kp[1])
				return; //"flat rectangle"
			const corner1 = [m.end.x, kp[1]];
			const corner2 = [kp[0], m.end.y];
			for (let [i,j] of [corner1,corner2])
			{
				if (this.board[i][j] != V.EMPTY && this.getColor(i,j) == oppCol)
				{
					const piece = this.getPiece(i,j);
					if (!byChameleon || piece == V.ROOK)
					{
						m.vanish.push( new PiPo({
							x:i,
							y:j,
							p:piece,
							c:oppCol
						}) );
					}
				}
			}
		});
	}

	// Coordinator
	getPotentialRookMoves(sq)
	{
		let moves = super.getPotentialQueenMoves(sq);
		this.addRookCaptures(moves);
		return moves;
	}

	// Long-leaper
	getKnightCaptures(startSquare, byChameleon)
	{
		// Look in every direction for captures
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		const color = this.turn;
		const oppCol = V.GetOppCol(color);
		let moves = [];
		const [x,y] = [startSquare[0],startSquare[1]];
		const piece = this.getPiece(x,y); //might be a chameleon!
		outerLoop:
		for (let step of steps)
		{
			let [i,j] = [x+step[0], y+step[1]];
			while (V.OnBoard(i,j) && this.board[i][j]==V.EMPTY)
			{
				i += step[0];
				j += step[1];
			}
			if (!V.OnBoard(i,j) || this.getColor(i,j)==color
				|| (!!byChameleon && this.getPiece(i,j)!=V.KNIGHT))
			{
				continue;
			}
			// last(thing), cur(thing) : stop if "cur" is our color, or beyond board limits,
			// or if "last" isn't empty and cur neither. Otherwise, if cur is empty then
			// add move until cur square; if cur is occupied then stop if !!byChameleon and
			// the square not occupied by a leaper.
			let last = [i,j];
			let cur = [i+step[0],j+step[1]];
			let vanished = [ new PiPo({x:x,y:y,c:color,p:piece}) ];
			while (V.OnBoard(cur[0],cur[1]))
			{
				if (this.board[last[0]][last[1]] != V.EMPTY)
				{
					const oppPiece = this.getPiece(last[0],last[1]);
					if (!!byChameleon && oppPiece != V.KNIGHT)
						continue outerLoop;
					// Something to eat:
					vanished.push( new PiPo({x:last[0],y:last[1],c:oppCol,p:oppPiece}) );
				}
				if (this.board[cur[0]][cur[1]] != V.EMPTY)
				{
					if (this.getColor(cur[0],cur[1]) == color
						|| this.board[last[0]][last[1]] != V.EMPTY) //TODO: redundant test
					{
						continue outerLoop;
					}
				}
				else
				{
					moves.push(new Move({
						appear: [ new PiPo({x:cur[0],y:cur[1],c:color,p:piece}) ],
						vanish: JSON.parse(JSON.stringify(vanished)), //TODO: required?
						start: {x:x,y:y},
						end: {x:cur[0],y:cur[1]}
					}));
				}
				last = [last[0]+step[0],last[1]+step[1]];
				cur = [cur[0]+step[0],cur[1]+step[1]];
			}
		}
		return moves;
	}

	// Long-leaper
	getPotentialKnightMoves(sq)
	{
		return super.getPotentialQueenMoves(sq).concat(this.getKnightCaptures(sq));
	}

	getPotentialBishopMoves([x,y])
	{
		let moves = super.getPotentialQueenMoves([x,y])
			.concat(this.getKnightCaptures([x,y],"asChameleon"));
		// No "king capture" because king cannot remain under check
		this.addPawnCaptures(moves, "asChameleon");
		this.addRookCaptures(moves, "asChameleon");
		this.addQueenCaptures(moves, "asChameleon");
		// Post-processing: merge similar moves, concatenating vanish arrays
		let mergedMoves = {};
		moves.forEach(m => {
			const key = m.end.x + V.size.x * m.end.y;
			if (!mergedMoves[key])
				mergedMoves[key] = m;
			else
			{
				for (let i=1; i<m.vanish.length; i++)
					mergedMoves[key].vanish.push(m.vanish[i]);
			}
		});
		// Finally return an array
		moves = [];
		Object.keys(mergedMoves).forEach(k => { moves.push(mergedMoves[k]); });
		return moves;
	}

	// Withdrawer
	addQueenCaptures(moves, byChameleon)
	{
		if (moves.length == 0)
			return;
		const [x,y] = [moves[0].start.x,moves[0].start.y];
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		let capturingDirections = [];
		const color = this.turn;
		const oppCol = V.GetOppCol(color);
		adjacentSteps.forEach(step => {
			const [i,j] = [x+step[0],y+step[1]];
			if (V.OnBoard(i,j) && this.board[i][j] != V.EMPTY && this.getColor(i,j) == oppCol
				&& (!byChameleon || this.getPiece(i,j) == V.QUEEN))
			{
				capturingDirections.push(step);
			}
		});
		moves.forEach(m => {
			const step = [
				m.end.x!=x ? (m.end.x-x)/Math.abs(m.end.x-x) : 0,
				m.end.y!=y ? (m.end.y-y)/Math.abs(m.end.y-y) : 0
			];
			// NOTE: includes() and even _.isEqual() functions fail...
			// TODO: this test should be done only once per direction
			if (capturingDirections.some(dir =>
				{ return (dir[0]==-step[0] && dir[1]==-step[1]); }))
			{
				const [i,j] = [x-step[0],y-step[1]];
				m.vanish.push(new PiPo({
					x:i,
					y:j,
					p:this.getPiece(i,j),
					c:oppCol
				}));
			}
		});
	}

	getPotentialQueenMoves(sq)
	{
		let moves = super.getPotentialQueenMoves(sq);
		this.addQueenCaptures(moves);
		return moves;
	}

	getPotentialImmobilizerMoves(sq)
	{
		// Immobilizer doesn't capture
		return super.getPotentialQueenMoves(sq);
	}

	getPotentialKingMoves(sq)
	{
		return this.getSlideNJumpMoves(sq,
			V.steps[V.ROOK].concat(V.steps[V.BISHOP]), "oneStep");
	}

	// isAttacked() is OK because the immobilizer doesn't take

	isAttackedByPawn([x,y], colors)
	{
		// Square (x,y) must be surroundable by two enemy pieces,
		// and one of them at least should be a pawn (moving).
		const dirs = [ [1,0],[0,1] ];
		const steps = V.steps[V.ROOK];
		for (let dir of dirs)
		{
			const [i1,j1] = [x-dir[0],y-dir[1]]; //"before"
			const [i2,j2] = [x+dir[0],y+dir[1]]; //"after"
			if (V.OnBoard(i1,j1) && V.OnBoard(i2,j2))
			{
				if ((this.board[i1][j1]!=V.EMPTY && colors.includes(this.getColor(i1,j1))
					&& this.board[i2][j2]==V.EMPTY)
						||
					(this.board[i2][j2]!=V.EMPTY && colors.includes(this.getColor(i2,j2))
					&& this.board[i1][j1]==V.EMPTY))
				{
					// Search a movable enemy pawn landing on the empty square
					for (let step of steps)
					{
						let [ii,jj] = (this.board[i1][j1]==V.EMPTY ? [i1,j1] : [i2,j2]);
						let [i3,j3] = [ii+step[0],jj+step[1]];
						while (V.OnBoard(i3,j3) && this.board[i3][j3]==V.EMPTY)
						{
							i3 += step[0];
							j3 += step[1];
						}
						if (V.OnBoard(i3,j3) && colors.includes(this.getColor(i3,j3))
							&& this.getPiece(i3,j3) == V.PAWN && !this.isImmobilized([i3,j3]))
						{
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	isAttackedByRook([x,y], colors)
	{
		// King must be on same column or row,
		// and a rook should be able to reach a capturing square
		// colors contains only one element, giving the oppCol and thus king position
		const sameRow = (x == this.kingPos[colors[0]][0]);
		const sameColumn = (y == this.kingPos[colors[0]][1]);
		if (sameRow || sameColumn)
		{
			// Look for the enemy rook (maximum 1)
			for (let i=0; i<V.size.x; i++)
			{
				for (let j=0; j<V.size.y; j++)
				{
					if (this.board[i][j] != V.EMPTY && colors.includes(this.getColor(i,j))
						&& this.getPiece(i,j) == V.ROOK)
					{
						if (this.isImmobilized([i,j]))
							return false; //because only one rook
						// Can it reach a capturing square?
						// Easy but quite suboptimal way (TODO): generate all moves (turn is OK)
						const moves = this.getPotentialMovesFrom([i,j]);
						for (let move of moves)
						{
							if (sameRow && move.end.y == y || sameColumn && move.end.x == x)
								return true;
						}
					}
				}
			}
		}
		return false;
	}

	isAttackedByKnight([x,y], colors)
	{
		// Square (x,y) must be on same line as a knight,
		// and there must be empty square(s) behind.
		const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		outerLoop:
		for (let step of steps)
		{
			const [i0,j0] = [x+step[0],y+step[1]];
			if (V.OnBoard(i0,j0) && this.board[i0][j0] == V.EMPTY)
			{
				// Try in opposite direction:
				let [i,j] = [x-step[0],y-step[1]];
				while (V.OnBoard(i,j))
				{
					while (V.OnBoard(i,j) && this.board[i][j] == V.EMPTY)
					{
						i -= step[0];
						j -= step[1];
					}
					if (V.OnBoard(i,j))
					{
						if (colors.includes(this.getColor(i,j)))
						{
							if (this.getPiece(i,j) == V.KNIGHT && !this.isImmobilized([i,j]))
								return true;
							continue outerLoop;
						}
						// [else] Our color, could be captured *if there was an empty space*
						if (this.board[i+step[0]][j+step[1]] != V.EMPTY)
							continue outerLoop;
						i -= step[0];
						j -= step[1];
					}
				}
			}
		}
		return false;
	}

	isAttackedByBishop([x,y], colors)
	{
		// We cheat a little here: since this function is used exclusively for king,
		// it's enough to check the immediate surrounding of the square.
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		for (let step of adjacentSteps)
		{
			const [i,j] = [x+step[0],y+step[1]];
			if (V.OnBoard(i,j) && this.board[i][j]!=V.EMPTY
				&& colors.includes(this.getColor(i,j)) && this.getPiece(i,j) == V.BISHOP)
			{
				return true; //bishops are never immobilized
			}
		}
		return false;
	}

	isAttackedByQueen([x,y], colors)
	{
		// Square (x,y) must be adjacent to a queen, and the queen must have
		// some free space in the opposite direction from (x,y)
		const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
		for (let step of adjacentSteps)
		{
			const sq2 = [x+2*step[0],y+2*step[1]];
			if (V.OnBoard(sq2[0],sq2[1]) && this.board[sq2[0]][sq2[1]] == V.EMPTY)
			{
				const sq1 = [x+step[0],y+step[1]];
				if (this.board[sq1[0]][sq1[1]] != V.EMPTY
					&& colors.includes(this.getColor(sq1[0],sq1[1]))
					&& this.getPiece(sq1[0],sq1[1]) == V.QUEEN
					&& !this.isImmobilized(sq1))
				{
					return true;
				}
			}
		}
		return false;
	}

	static get VALUES()
	{
		// TODO: totally experimental!
		return {
			'p': 1,
			'r': 2,
			'n': 5,
			'b': 3,
			'q': 3,
			'm': 5,
			'k': 1000
		};
	}

	static get SEARCH_DEPTH() { return 2; } //TODO?

	static GenRandInitFen()
	{
		let pieces = { "w": new Array(8), "b": new Array(8) };
		// Shuffle pieces on first and last rank
		for (let c of ["w","b"])
		{
			let positions = range(8);
			// Get random squares for every piece, totally freely

			let randIndex = randInt(8);
			const bishop1Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = randInt(7);
			const bishop2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = randInt(6);
			const knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = randInt(5);
			const knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = randInt(4);
			const queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = randInt(3);
			const kingPos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = randInt(2);
			const rookPos = positions[randIndex];
			positions.splice(randIndex, 1);
			const immobilizerPos = positions[0];

			pieces[c][bishop1Pos] = 'b';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight1Pos] = 'n';
			pieces[c][knight2Pos] = 'n';
			pieces[c][queenPos] = 'q';
			pieces[c][kingPos] = 'k';
			pieces[c][rookPos] = 'r';
			pieces[c][immobilizerPos] = 'm';
		}
		return pieces["b"].join("") +
			"/pppppppp/8/8/8/8/PPPPPPPP/" +
			pieces["w"].join("").toUpperCase() +
			" w";
	}

	getNotation(move)
	{
		const initialSquare = V.CoordsToSquare(move.start);
		const finalSquare = V.CoordsToSquare(move.end);
		let notation = undefined;
		if (move.appear[0].p == V.PAWN)
		{
			// Pawn: generally ambiguous short notation, so we use full description
			notation = "P" + initialSquare + finalSquare;
		}
		else if (move.appear[0].p == V.KING)
			notation = "K" + (move.vanish.length>1 ? "x" : "") + finalSquare;
		else
			notation = move.appear[0].p.toUpperCase() + finalSquare;
		if (move.vanish.length > 1 && move.appear[0].p != V.KING)
			notation += "X"; //capture mark (not describing what is captured...)
		return notation;
	}
}
