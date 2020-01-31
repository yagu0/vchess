<template lang="pug">
div
  #scoreInfo(v-if="score!='*'")
    p {{ score }}
    p {{ message }}
  table#movesList
    tbody
      tr(v-for="moveIdx in evenNumbers")
        td {{ moveIdx / 2 + 1 }}
        td(:class="{'highlight-lm': cursor == moveIdx}"
            data-label="White move" @click="() => gotoMove(moveIdx)")
          | {{ moves[moveIdx].notation }}
        td(v-if="moveIdx < moves.length-1"
            :class="{'highlight-lm': cursor == moveIdx+1}"
            data-label="Black move" @click="() => gotoMove(moveIdx+1)")
          | {{ moves[moveIdx+1].notation }}
        // Else: just add an empty cell
        td(v-else)
</template>

<script>
// Component for moves list on the right
export default {
  name: 'my-move-list',
	props: ["moves","cursor","score","message"],
  watch: {
    cursor: function(newValue) {
      if (newValue < 0)
        newValue = 0; //avoid rows[-1] --> error
      // $nextTick to wait for table > tr to be rendered
      this.$nextTick( () => {
        let rows = document.querySelectorAll('#movesList tr');
        if (rows.length > 0)
        {
          rows[Math.floor(newValue/2)].scrollIntoView({
            behavior: "auto",
            block: "nearest",
          });
        }
      });
    },
  },
  computed: {
    evenNumbers: function() {
      return [...Array(this.moves.length).keys()].filter(i => i%2==0);
    },
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
td.highlight-lm
  background-color: plum
</style>

<!-- Old render method:
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
    const scoreDiv = h("div",
      {
        id: "scoreInfo",
        style: {
          display: this.score!="*" ? "block" : "none",
        },
      },
      [
        h("p", this.score),
        h("p", this.message),
      ]
    );
		const movesTable = h(
      "div",
      { },
      [
        scoreDiv,
        h(
          "table",
          {
            "class": {
              "moves-list": true,
            },
          },
          tableContent
		    )
      ]
    );
		return movesTable;
	},
-->
