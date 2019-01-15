//TODO: component for moves list on the right
// TODO: generic "getPGN" in the same way (following move.color)
Vue.component('my-move-list', {
	props: ["moves","cursor"], //TODO: other props for e.g. players names + connected indicator
	// --> we could also add turn indicator here
	// + missing "cursor" prop
	data: function() {
		return {
			something: "", //TODO
		};
	},
	// TODO: extend rendering for more than 2 colors: would be a parameter
	render(h) {
		if (this.moves.length == 0)
			return;
		const nbColors = 2;
		// TODO: name colors "white", "black", "red", "yellow" ?
		if (this.moves[0].color == "b")
			this.moves.unshift({color: "w", notation: "..."});
		let tableContent = [];
		let moveCounter = 0;
		let tableRow = undefined;
		let moveCells = undefined;
		let curCellContent = "";
		for (let i=0; i<this.moves.length; i++)
		{
			if (this.moves[i].color == "w")
			{
				if (i == 0 || i>0 && this.moves[i-1].color=="b")
				{
					if (!!tableRow)
					{
						tableRow.children = moveCells;
						tableContent.push(tableRow);
					}
					moveCells = [
						h(
							"td",
							{ domProps: { innerHTML: (++moveCounter) + "." } }
						)
					];
					tableRow = h(
						"tr",
						{ }
					);
					curCellContent = "";
				}
			}
			curCellContent += this.moves[i].notation;
			if (i < this.moves.length-1 && this.moves[i+1].color == this.moves[i].color)
				curCellContent += ",";
			else //color change
			{
				moveCells.push(
					h(
						"td",
						{
							domProps: { innerHTML: curCellContent },
							on: { click: () => this.gotoMove(i) },
							"class": { "highlight-lm": this.cursor == i },
						}
					)
				);
				curCellContent = "";
			}
		}
		// Complete last row, which might not be full:
		if (moveCells.length-1 < nbColors)
		{
			const delta = nbColors - (moveCells.length-1);
			for (let i=0; i<delta; i++)
			{
				moveCells.push(
					h(
						"td",
						{ domProps: { innerHTML: "" } }
					)
				);
			}
		}
		tableRow.children = moveCells;
		tableContent.push(tableRow);
		const movesTable = h(
			"table",
			{ },
			tableContent
		);
		return movesTable;
	},
	methods: {
		gotoMove: function(index) {
			this.$emit("goto-move", index);
		},
	},
})
