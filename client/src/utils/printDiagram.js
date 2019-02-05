import { ArrayFun } from "@/utils/array";

// Turn (human) marks into coordinates
function getMarkArray(marks)
{
	if (!marks || marks == "-")
		return [];
	let markArray = ArrayFun.init(V.size.x, V.size.y, false);
	const squares = marks.split(",");
	for (let i=0; i<squares.length; i++)
	{
		const coords = V.SquareToCoords(squares[i]);
		markArray[coords.x][coords.y] = true;
	}
	return markArray;
}

// Turn (human) shadow indications into coordinates
function getShadowArray(shadow)
{
	if (!shadow || shadow == "-")
		return [];
	let shadowArray = ArrayFun.init(V.size.x, V.size.y, false);
	const squares = shadow.split(",");
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
	return shadowArray;
}

// args: object with position (mandatory), and
// orientation, marks, shadow (optional)
export function getDiagram(args)
{
	// Obtain the array of pieces images names:
	const board = V.GetBoard(args.position);
	const orientation = args.orientation || "w";
	const markArray = getMarkArray(args.marks);
	const shadowArray = getShadowArray(args.shadow);
	let boardDiv = "";
	const [startX,startY,inc] = orientation == 'w'
		? [0, 0, 1]
		: [V.size.x-1, V.size.y-1, -1];
	for (let i=startX; i>=0 && i<V.size.x; i+=inc)
	{
		boardDiv += "<div class='row'>";
		for (let j=startY; j>=0 && j<V.size.y; j+=inc)
		{
			boardDiv += "<div class='board board" + V.size.y + " " +
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
