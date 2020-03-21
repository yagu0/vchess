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
  #aboveMoves
    // NOTE: variants pages already have a "Rules" link on top
    span#rulesBtn(
      v-if="!$route.path.match('/variants/')"
      @click="$emit('showrules')"
    )
      | {{ st.tr["Rules"] }}
    button.tooltip(
      onClick="window.doClick('modalAdjust')"
      :aria-label="st.tr['Resize board']"
    )
      img.inline(src="/images/icons/resize.svg")
    button.tooltip(
      v-if="canAnalyze"
      @click="$emit('analyze')"
      :aria-label="st.tr['Analyse']"
    )
      img.inline(src="/images/icons/analyse.svg")
    #downloadDiv(v-if="canDownload")
      a#download(href="#")
      button.tooltip(
        @click="$emit('download')"
        :aria-label="st.tr['Download'] + ' PGN'"
      )
        img.inline(src="/images/icons/download.svg")
  #scoreInfo(v-if="score!='*'")
    span.score {{ score }}
    span.score-msg {{ st.tr[message] }}
  .moves-list(v-if="!['none','highlight'].includes(show)")
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
  props: [
    "moves", "show", "canAnalyze", "canDownload",
    "cursor", "score", "message", "firstNum"],
  data: function() {
    return {
      st: store.state
    };
  },
  mounted: function() {
    document.getElementById("adjuster")
      .addEventListener("click", processModalClick);
    if ("ontouchstart" in window) {
      // Disable tooltips on smartphones:
      document.querySelectorAll("#aboveMoves .tooltip").forEach(elt => {
        elt.classList.remove("tooltip");
      });
    }
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
        if (!curMove && this.moves.length > 0)
          // Cursor is before game beginning, and some moves were made:
          curMove = document.querySelector(".moves-list > .tr:first-child > .td");
        if (!!curMove) {
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
  user-select: none
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
      padding: 2% 0 2% 2%
      &:first-child
        color: grey
        width: 13%
      &:not(first-child)
        width: 40.5%

@media screen and (max-width: 767px)
  .moves-list
    width: 100%

.td.highlight-lm
  background-color: plum

#boardSizeBtnContainer
  width: 100%
  text-align: center

[type="checkbox"]#modalAdjust+div .card
  padding: 5px

img.inline
  height: 22px
  @media screen and (max-width: 767px)
    height: 18px

#scoreInfo
  margin: 10px 0
  @media screen and (max-width: 767px)
    margin: 5px 0

span.score
  display: inline-block
  margin-left: 10px
  font-weight: bold

span.score-msg
  display: inline-block
  margin-left: 10px
  font-style: italic

#downloadDiv
  display: inline-block
  margin: 0

span#rulesBtn
  cursor: pointer
  display: inline-block
  margin: 0 10px
  font-weight: bold

button
  margin: 0

#aboveMoves button
  padding-bottom: 5px
</style>
