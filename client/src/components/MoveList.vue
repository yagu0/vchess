<script>
import { store } from "@/store";
export default {
  name: 'my-move-list',
  props: ["moves","cursor","score","message","firstNum"],
  watch: {
    cursor: function(newCursor) {
      if (window.innerWidth <= 767)
        return; //moves list is below: scrolling would hide chessboard
      // Count grouped moves until the cursor (if multi-moves):
      let groupsCount = -1;
      let curCol = undefined;
      for (let i=0; i<newCursor; i++)
      {
        const m = this.moves[i];
        if (m.color != curCol)
        {
          groupsCount++;
          curCol = m.color;
        }
      }
      // $nextTick to wait for table > tr to be rendered
      this.$nextTick( () => {
        let rows = document.querySelectorAll('#movesList tr');
        if (rows.length > 0)
        {
          rows[Math.floor(Math.max(groupsCount,0)/2)].scrollIntoView({
            behavior: "auto",
            block: "nearest",
          });
        }
      });
    },
  },
  render(h) {
    if (this.moves.length == 0)
      return;
    let tableContent = [];
    let moveCounter = 0;
    let tableRow = undefined;
    let moveCells = undefined;
    let curCellContent = "";
    let firstIndex = 0;
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
          firstIndex = i;
        }
      }
      // Next condition is fine because even if the first move is black,
      // there will be the "..." which count as white move.
      else if (this.moves[i].color == "b" && this.moves[i-1].color == "w")
        firstIndex = i;
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
              "class": { "highlight-lm":
                this.cursor >= firstIndex && this.cursor <= i },
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
    let rootElements = [];
    if (!!this.score && this.score != "*")
    {
      const scoreDiv = h("div",
        {
          id: "scoreInfo",
          style: {
            display: this.score!="*" ? "block" : "none",
          },
        },
        [
          h("p", this.score),
          h("p", store.state.tr[this.message]),
        ]
      );
      rootElements.push(scoreDiv);
    }
    rootElements.push(
      h(
        "table",
        {
          "class": {
            "moves-list": true,
          },
        },
        tableContent
      )
    );
    return h(
      "div",
      { },
      rootElements);
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
