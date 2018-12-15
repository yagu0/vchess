// Assuming V(ariantRules) class is loaded.
// args: object with position (mandatory), orientation, marks (optional)
function getDiagram(args)
{
	const [sizeX,sizeY] = [V.size.x,V.size.y];
	// Obtain array of pieces images names
	const board = VariantRules.GetBoard(args.position);
	const orientation = args.orientation || "w";
	let markArray = [];
	if (!!args.marks)
	{
		// Turn (human) marks into coordinates
		markArray = doubleArray(sizeX, sizeY, false);
		let squares = args.marks.split(",");
		for (let i=0; i<squares.length; i++)
		{
			const res = /^([a-z]+)([0-9]+)$/i.exec(squares[i]);
			const x = sizeX - parseInt(res[2]); //white at bottom, so counting is reversed
			const y = res[1].charCodeAt(0)-97; //always one char: max 26, big enough
			markArray[x][y] = true;
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
				((i+j)%2==0 ? "light-square-diag" : "dark-square-diag") + "'>";
			if (board[i][j] != V.EMPTY)
			{
				boardDiv += "<img src='/images/pieces/" +
					V.getPpath(board[i][j]) + ".svg' class='piece'/>";
			}
			if (!!args.marks && markArray[i][j])
				boardDiv += "<img src='/images/mark.svg' class='mark-square'/>";
			boardDiv += "</div>";
		}
		boardDiv += "</div>";
	}
	return boardDiv;
}
