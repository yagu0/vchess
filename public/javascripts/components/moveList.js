//TODO: component for moves list on the right
// TODO: generic "getPGN" in the same way (following move.color)
Vue.component('my-move-list', {
	props: ["moves"], //TODO: other props for e.g. players names + connected indicator
	// --> we could also add turn indicator here
	data: function() {
		return {
			// if oppid == "computer" then mode = "computer" (otherwise human)
			myid: "", //TODO
		};
	},
	// TODO: extend rendering for more than 2 colors: would be a parameter
	render(h) {
		if (this.moves.length == 0)
			return;
		const nbColors = 2;
		if (this.moves[0].color == "black")
			this.moves.unshift({color: "white", notation: "..."});
		let tableContent = [];
		let moveCounter = 0;
		let tableRow = undefined;
		let moveCells = undefined;
		let curCellContent = "";
		for (let i=0; i<this.moves.length; i++)
		{
			if (this.moves[i].color == "white")
			{
				if (i == 0 || i>0 && this.moves[i-1].color=="black")
				{
					if (!!tableRow)
						tableContent.push(tableRow);
					moveCells = [
						h(
							"td",
							{ attrs: { innerHTML: (++moveCounter) + "." } }
						)
					];
					tableRow = h(
						"tr",
						{ },
						moveCells
					);
					curCellContent = "";
				}
				curCellContent += this.moves[i].notation + ",";
				moveCells.push(
					h(
						"td",
						{ attrs: ..............
			}
		}
		// Complete last row, which might not be full:
		if (tableRow.length-1 < nbColors)
		{
			const delta = nbColors - (moveCells.length-1);
			for (let i=0; i<delta; i++)
			{
				moveCells.push(
					"td"
					{ attrs: { innerHTML: "" } }
				);
			}
			tableContent.push(tableRow);
		}
		const movesTable = h(
			"table",
			{ },
			tableContent
		);
		return movesTable;
	},
//	methods: {
//	},
}
