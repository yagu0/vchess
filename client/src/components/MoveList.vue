<script>
// Component for moves list on the right
export default {
  name: 'my-move-list',
	props: ["moves","cursor"],
	render(h) {
		if (this.moves.length == 0)
			return;
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
		if (moveCells.length-1 == 1)
		{
      moveCells.push(
        h(
          "td",
          { domProps: { innerHTML: "" } }
        )
      );
		}
		tableRow.children = moveCells;
		tableContent.push(tableRow);
		const movesTable = h(
      "div",
      { },
      [h(
			  "table",
			  {
          "class": {
            "moves-list": true,
          },
        },
			  tableContent
		  )]
    );
		return movesTable;
	},
	methods: {
		gotoMove: function(index) {
			this.$emit("goto-move", index);
		},
	},
};
</script>

<style lang="sass" scoped>
.moves-list
  min-width: 250px
</style>
