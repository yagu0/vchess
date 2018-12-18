class WildebeestRules extends ChessRules
{
	static getPpath(b)
	{
		return ([V.CAMEL,V.WILDEBEEST].includes(b[1]) ? "Wildebeest/" : "") + b;
	}

	static get size() { return {x:10,y:11}; }

	static get CAMEL() { return 'c'; }
	static get WILDEBEEST() { return 'w'; }

	static get PIECES()
	{
		return ChessRules.PIECES.concat([V.CAMEL,V.WILDEBEEST]);
	}

	static get steps()
	{
		return Object.assign(
			ChessRules.steps, //add camel moves:
			{'c': [ [-3,-1],[-3,1],[-1,-3],[-1,3],[1,-3],[1,3],[3,-1],[3,1] ]}
		);
	}

	// There may be 2 enPassant squares (if pawn jump 3 squares)
	getEnpassantFen()
	{
		const L = this.epSquares.length;
		if (!this.epSquares[L-1])
			return "-"; //no en-passant
		let res = "";
		this.epSquares[L-1].forEach(sq => {
			res += V.CoordsToSquare(sq) + ",";
		});
		return res.slice(0,-1); //remove last comma
	}

	// En-passant after 2-sq or 3-sq jumps
	getEpSquare(moveOrSquare)
	{
		if (!moveOrSquare)
			return undefined;
		if (typeof moveOrSquare === "string")
		{
			const square = moveOrSquare;
			if (square == "-")
				return undefined;
			let res = [];
			square.split(",").forEach(sq => {
				res.push(V.SquareToCoords(sq));
			});
			return res;
		}
		// Argument is a move:
		const move = moveOrSquare;
		const [sx,sy,ex] = [move.start.x,move.start.y,move.end.x];
		if (this.getPiece(sx,sy) == V.PAWN && Math.abs(sx - ex) >= 2)
		{
			const step = (ex-sx) / Math.abs(ex-sx);
			let res = [{
				x: sx + step,
				y: sy
			}];
			if (sx + 2*step != ex) //3-squares move
			{
				res.push({
					x: sx + 2*step,
					y: sy
				});
			}
			return res;
		}
		return undefined; //default
	}

	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case V.CAMEL:
				return this.getPotentialCamelMoves([x,y]);
			case V.WILDEBEEST:
				return this.getPotentialWildebeestMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y])
		}
	}

	// Pawns jump 2 or 3 squares, and promote to queen or wildebeest
	getPotentialPawnMoves([x,y])
	{
		const color = this.turn;
		let moves = [];
		const [sizeX,sizeY] = [V.size.x,V.size.y];
		const shift = (color == "w" ? -1 : 1);
		const startRanks = (color == "w" ? [sizeX-2,sizeX-3] : [1,2]);
		const lastRank = (color == "w" ? 0 : sizeX-1);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRank)
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y]));
				if (startRanks.includes(x) && this.board[x+2*shift][y] == V.EMPTY)
				{
					// Two squares jump
					moves.push(this.getBasicMove([x,y], [x+2*shift,y]));
					if (x == startRanks[0] && this.board[x+3*shift][y] == V.EMPTY)
					{
						// 3-squares jump
						moves.push(this.getBasicMove([x,y], [x+3*shift,y]));
					}
				}
			}
			// Captures
			if (y>0 && this.canTake([x,y], [x+shift,y-1])
				&& this.board[x+shift][y-1] != V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y-1]));
			}
			if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1])
				&& this.board[x+shift][y+1] != V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y+1]));
			}
		}

		if (x+shift == lastRank)
		{
			// Promotion
			let promotionPieces = [V.QUEEN,V.WILDEBEEST];
			promotionPieces.forEach(p => {
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:p}));
				// Captures
				if (y>0 && this.canTake([x,y], [x+shift,y-1])
					&& this.board[x+shift][y-1] != V.EMPTY)
				{
					moves.push(this.getBasicMove([x,y], [x+shift,y-1], {c:color,p:p}));
				}
				if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1])
					&& this.board[x+shift][y+1] != V.EMPTY)
				{
					moves.push(this.getBasicMove([x,y], [x+shift,y+1], {c:color,p:p}));
				}
			});
		}

		// En passant
		const Lep = this.epSquares.length;
		const epSquare = Lep>0 ? this.epSquares[Lep-1] : undefined;
		if (!!epSquare)
		{
			for (let epsq of epSquare)
			{
				// TODO: some redundant checks
				if (epsq.x == x+shift && Math.abs(epsq.y - y) == 1)
				{
					let epStep = epsq.y - y;
					var enpassantMove = this.getBasicMove([x,y], [x+shift,y+epStep]);
					enpassantMove.vanish.push({
						x: x,
						y: y+epStep,
						p: 'p',
						c: this.getColor(x,y+epStep)
					});
					moves.push(enpassantMove);
				}
			}
		}

		return moves;
	}

	// TODO: wildebeest castle

	getPotentialCamelMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, V.steps[V.CAMEL], "oneStep");
	}

	getPotentialWildebeestMoves(sq)
	{
		return this.getSlideNJumpMoves(
			sq, V.steps[V.KNIGHT].concat(V.steps[V.CAMEL]), "oneStep");
	}

	isAttacked(sq, colors)
	{
		return super.isAttacked(sq, colors)
			|| this.isAttackedByCamel(sq, colors)
			|| this.isAttackedByWildebeest(sq, colors);
	}

	isAttackedByCamel(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors,
			V.CAMEL, V.steps[V.CAMEL], "oneStep");
	}

	isAttackedByWildebeest(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.WILDEBEEST,
			V.steps[V.KNIGHT].concat(V.steps[V.CAMEL]), "oneStep");
	}

	checkGameEnd()
	{
		// No valid move: game is lost (stalemate is a win)
		return this.turn == "w" ? "0-1" : "1-0";
	}

	static get VALUES() {
		return Object.assign(
			ChessRules.VALUES,
			{'c': 3, 'w': 7} //experimental
		);
	}

	static get SEARCH_DEPTH() { return 2; }

	static GenRandInitFen()
	{
		let pieces = { "w": new Array(10), "b": new Array(10) };
		for (let c of ["w","b"])
		{
			let positions = _.range(11);

			// Get random squares for bishops + camels (different colors)
			let randIndexes = _.sample(_.range(6), 2).map(i => { return 2*i; });
			let bishop1Pos = positions[randIndexes[0]];
			let camel1Pos = positions[randIndexes[1]];
			// The second bishop (camel) must be on a square of different color
			let randIndexes_tmp = _.sample(_.range(5), 2).map(i => { return 2*i+1; });
			let bishop2Pos = positions[randIndexes_tmp[0]];
			let camel2Pos = positions[randIndexes_tmp[1]];
			for (let idx of randIndexes.concat(randIndexes_tmp)
				.sort((a,b) => { return b-a; })) //largest indices first
			{
				positions.splice(idx, 1);
			}

			let randIndex = _.random(6);
			let knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			randIndex = _.random(5);
			let knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			randIndex = _.random(4);
			let queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Random square for wildebeest
			randIndex = _.random(3);
			let wildebeestPos = positions[randIndex];
			positions.splice(randIndex, 1);

			let rook1Pos = positions[0];
			let kingPos = positions[1];
			let rook2Pos = positions[2];

			pieces[c][rook1Pos] = 'r';
			pieces[c][knight1Pos] = 'n';
			pieces[c][bishop1Pos] = 'b';
			pieces[c][queenPos] = 'q';
			pieces[c][camel1Pos] = 'c';
			pieces[c][camel2Pos] = 'c';
			pieces[c][wildebeestPos] = 'w';
			pieces[c][kingPos] = 'k';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight2Pos] = 'n';
			pieces[c][rook2Pos] = 'r';
		}
		return pieces["b"].join("") +
			"/ppppppppppp/11/11/11/11/11/11/PPPPPPPPPPP/" +
			pieces["w"].join("").toUpperCase() +
			" w 1111 -";
	}
}

const VariantRules = WildebeestRules;
