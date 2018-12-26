// Assuming V(ariantRules) class is loaded.
// args: object with position (mandatory), orientation, marks (optional)
function getDiagram(args)
{
	const [sizeX,sizeY] = [V.size.x,V.size.y];
	// Obtain array of pieces images names
	const board = VariantRules.GetBoard(args.position);
	const orientation = args.orientation || "w";
	let markArray = [];
	if (!!args.marks && args.marks != "-")
	{
		// Turn (human) marks into coordinates
		markArray = doubleArray(sizeX, sizeY, false);
		let squares = args.marks.split(",");
		for (let i=0; i<squares.length; i++)
		{
			const coords = V.SquareToCoords(squares[i]);
			markArray[coords.x][coords.y] = true;
		}
	}
	let shadowArray = [];
	if (!!args.shadow && args.shadow != "-")
	{
		// Turn (human) shadow indications into coordinates
		shadowArray = doubleArray(sizeX, sizeY, false);
		let squares = args.shadow.split(",");
		for (let i=0; i<squares.length; i++)
		{
			const rownum = V.size.x - parseInt(squares[i]);
			if (!isNaN(rownum))
			{
				// Shadow a full row
				for (let i=0; i<V.size.y; i++)
					shadowArray[rownum][i] = true;
				continue;
			}
			if (squares[i].length == 1)
			{
				// Shadow a full column
				const colnum = V.ColumnToCoord(squares[i]);
				for (let i=0; i<V.size.x; i++)
					shadowArray[i][colnum] = true;
				continue;
			}
			if (squares[i].indexOf("-") >= 0)
			{
				// Shadow a range of squares, horizontally or vertically
				const firstLastSq = squares[i].split("-");
				const range =
				[
					V.SquareToCoords(firstLastSq[0]),
					V.SquareToCoords(firstLastSq[1])
				];
				const step =
				[
					range[1].x == range[0].x
						? 0
						: (range[1].x - range[0].x) / Math.abs(range[1].x - range[0].x),
					range[1].y == range[0].y
						? 0
						: (range[1].y - range[0].y) / Math.abs(range[1].y - range[0].y)
				];
				// Convention: range always from smaller to larger number
				for (let x=range[0].x, y=range[0].y; x <= range[1].x && y <= range[1].y;
					x += step[0], y += step[1])
				{
					shadowArray[x][y] = true;
				}
				continue;
			}
			// Shadow just one square:
			const coords = V.SquareToCoords(squares[i]);
			shadowArray[coords.x][coords.y] = true;
		}
	}
	let boardDiv = "";
	const [startX,startY,inc] = orientation == 'w'
		? [0, 0, 1]
		: [sizeX-1, sizeY-1, -1];
	for (let i=startX; i>=0 && i<sizeX; i+=inc)
	{
		boardDiv += "<div class='row'>";
		for (let j=startY; j>=0 && j<sizeY; j+=inc)
		{
			boardDiv += "<div class='board board" + sizeY + " " +
				((i+j)%2==0 ? "light-square-diag" : "dark-square-diag") +
				(shadowArray.length > 0 && shadowArray[i][j] ? " in-shadow" : "") +
				"'>";
			if (board[i][j] != V.EMPTY)
			{
				boardDiv += "<img src='/images/pieces/" +
					V.getPpath(board[i][j]) + ".svg' class='piece'/>";
			}
			if (markArray.length > 0 && markArray[i][j])
				boardDiv += "<img src='/images/mark.svg' class='mark-square'/>";
			boardDiv += "</div>";
		}
		boardDiv += "</div>";
	}
	return boardDiv;
}
