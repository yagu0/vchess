<template lang="pug">
div
  input#modalAdjust.modal(type="checkbox")
  div#adjuster(
    role="dialog"
    data-checkbox="modalAdjust"
  )
    .card.text-center
      label.modal-close(for="modalAdjust")
      label(for="boardSize") {{ st.tr["Board size"] }}
      input#boardSize.slider(
        type="range"
        min="0"
        max="100"
        value="50"
        @input="adjustBoard()"
      )
  div#boardSizeBtnContainer
    button#boardSizeBtn(onClick="window.doClick('modalAdjust')")
      | {{ st.tr["Set board size"] }}
  #scoreInfo(v-if="score!='*'")
    p {{ score }}
    p {{ st.tr[message] }}
  .moves-list(v-if="show != 'none'")
    .tr(v-for="moveIdx in evenNumbers")
      .td {{ firstNum + moveIdx / 2 + 1 }}
      .td(v-if="moveIdx < moves.length-1 || show == 'all'"
        :class="{'highlight-lm': cursor == moveIdx}"
        @click="() => gotoMove(moveIdx)"
      )
        | {{ notation(moves[moveIdx]) }}
      .td(
        v-if="moveIdx < moves.length-1"
        :class="{'highlight-lm': cursor == moveIdx+1}"
        @click="() => gotoMove(moveIdx+1)"
      )
        | {{ notation(moves[moveIdx+1]) }}
</template>

<script>
import { store } from "@/store";
import { getFullNotation } from "@/utils/notation";
import { processModalClick } from "@/utils/modalClick";
export default {
  name: "my-move-list",
  props: ["moves", "show", "cursor", "score", "message", "firstNum"],
  data: function() {
    return {
      st: store.state
    };
  },
  mounted: function() {
    document.getElementById("adjuster").addEventListener(
      "click",
      processModalClick);
    // Take full width on small screens:
    let boardSize = parseInt(localStorage.getItem("boardSize"));
    if (!boardSize) {
      boardSize =
        window.innerWidth >= 768
          ? 0.75 * Math.min(window.innerWidth, window.innerHeight)
          : window.innerWidth;
    }
    const movesWidth = window.innerWidth >= 768 ? 280 : 0;
    document.getElementById("boardContainer").style.width = boardSize + "px";
    let gameContainer = document.getElementById("gameContainer");
    gameContainer.style.width = boardSize + movesWidth + "px";
    document.getElementById("boardSize").value =
      (boardSize * 100) / (window.innerWidth - movesWidth);
    // timeout to avoid calling too many time the adjust method
    let timeoutLaunched = false;
    window.addEventListener("resize", () => {
      if (!timeoutLaunched) {
        timeoutLaunched = true;
        setTimeout(() => {
          this.adjustBoard();
          timeoutLaunched = false;
        }, 500);
      }
    });
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
  computed: {
    evenNumbers: function() {
      return [...Array(this.moves.length).keys()].filter(i => i%2==0);
    }
  },
  methods: {
    notation: function(move) {
      return getFullNotation(move);
    },
    gotoMove: function(index) {
      this.$emit("goto-move", index);
    },
    adjustBoard: function() {
      const boardContainer = document.getElementById("boardContainer");
      if (!boardContainer) return; //no board on page
      const k = document.getElementById("boardSize").value;
      const movesWidth = window.innerWidth >= 768 ? 280 : 0;
      const minBoardWidth = 240; //TODO: these 240 and 280 are arbitrary...
      // Value of 0 is board min size; 100 is window.width [- movesWidth]
      const boardSize =
        minBoardWidth +
        (k * (window.innerWidth - (movesWidth + minBoardWidth))) / 100;
      localStorage.setItem("boardSize", boardSize);
      boardContainer.style.width = boardSize + "px";
      document.getElementById("gameContainer").style.width =
        boardSize + movesWidth + "px";
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

#boardSizeBtnContainer
  width: 100%
  text-align: center

button#boardSizeBtn
  margin: 0

[type="checkbox"]#modalAdjust+div .card
  padding: 5px
</style>
