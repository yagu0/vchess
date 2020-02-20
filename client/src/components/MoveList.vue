<script>
import { store } from "@/store";
export default {
  name: "my-move-list",
  props: ["moves", "cursor", "score", "message", "firstNum"],
  render(h) {
    let rootElements = [];
    if (!!this.score && this.score != "*") {
      const scoreDiv = h(
        "div",
        {
          id: "scoreInfo",
          style: {
            display: this.score != "*" ? "block" : "none"
          }
        },
        [h("p", this.score), h("p", store.state.tr[this.message])]
      );
      rootElements.push(scoreDiv);
    }
    if (this.moves.length > 0) {
      let tableContent = [];
      let moveCounter = 0;
      let tableRow = undefined;
      let moveCells = undefined;
      let curCellContent = "";
      let firstIndex = 0;
      for (let i = 0; i < this.moves.length; i++) {
        if (this.moves[i].color == "w") {
          if (i == 0 || (i > 0 && this.moves[i - 1].color == "b")) {
            if (tableRow) {
              tableRow.children = moveCells;
              tableContent.push(tableRow);
            }
            moveCells = [
              h(
                "div",
                {
                  "class": {td: true},
                  domProps: { innerHTML: ++moveCounter + "." }
                }
              )
            ];
            tableRow = h("div", {"class": {tr: true}});
            curCellContent = "";
            firstIndex = i;
          }
        }
        // Next condition is fine because even if the first move is black,
        // there will be the "..." which count as white move.
        else if (this.moves[i].color == "b" && this.moves[i - 1].color == "w")
          firstIndex = i;
        curCellContent += this.moves[i].notation;
        if (
          i < this.moves.length - 1 &&
          this.moves[i + 1].color == this.moves[i].color
        )
          curCellContent += ",";
        else {
          // Color change
          moveCells.push(
            h(
              "div",
              {
                "class": {
                  td: true,
                  "highlight-lm": this.cursor >= firstIndex && this.cursor <= i
                },
                domProps: { innerHTML: curCellContent },
                on: { click: () => this.gotoMove(i) }
              }
            )
          );
          curCellContent = "";
        }
      }
      // Complete last row, which might not be full:
      if (moveCells.length - 1 == 1) {
        moveCells.push(h("div", {"class": {td: true}}));
      }
      tableRow.children = moveCells;
      tableContent.push(tableRow);
      rootElements.push(
        h(
          "div",
          {
            class: {
              "moves-list": true
            }
          },
          tableContent
        )
      );
    }
    return h("div", {}, rootElements);
  },
  watch: {
    cursor: function(newCursor) {
      if (window.innerWidth <= 767) return; //scrolling would hide chessboard
      // $nextTick to wait for table > tr to be rendered
      this.$nextTick(() => {
        let curMove = document.querySelector(".td.highlight-lm");
        if (curMove) {
          curMove.scrollIntoView({
            behavior: "auto",
            block: "nearest"
          });
        }
      });
    }
  },
  methods: {
    gotoMove: function(index) {
      this.$emit("goto-move", index);
    }
  }
};
</script>

<style lang="sass" scoped>
.moves-list
  cursor: pointer
  min-height: 1px
  max-height: 500px
  overflow: auto
  background-color: white
  width: 280px
  & > .tr
    clear: both
    border-bottom: 1px solid lightgrey
    & > .td
      float: left
      padding: 2% 0 2% 1%
      &:first-child
        color: grey
        width: 15%
      &:not(first-child)
        width: 41%

@media screen and (max-width: 767px)
  .moves-list
    width: 100%

.td.highlight-lm
  background-color: plum
</style>
