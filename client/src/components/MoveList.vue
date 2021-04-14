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
      @click="clickRulesBtn()"
      :class="btnRulesClass"
    )
      | {{ st.tr["Rules"] }}
    button(
      :class="btnTooltipClass()"
      onClick="window.doClick('modalAdjust')"
      :aria-label="st.tr['Resize board']"
    )
      img.inline(src="/images/icons/resize.svg")
    button#analyzeBtn(
      v-if="canAnalyze"
      :class="btnTooltipClass()"
      @click="$emit('analyze')"
      :aria-label="st.tr['Analyse']"
    )
      img.inline(src="/images/icons/analyse.svg")
    #downloadDiv(v-if="canDownload")
      a#download(href="#")
      button(
        :class="btnTooltipClass()"
        @click="$emit('download')"
        :aria-label="st.tr['Download'] + ' PGN'"
      )
        img.inline(src="/images/icons/download.svg")
  #scoreInfo(v-if="score!='*'")
    span.score {{ score }}
    span.score-msg {{ st.tr[message] }}
  .moves-list
    .tr(v-for="moveIdx in evenNumbers")
      .td {{ firstNum + moveIdx / 2 }}
      .td(
        :class="{'highlight-lm': cursor == moveIdx}"
        @click="() => gotoMove(moveIdx)"
        v-html="notation(moveIdx)")
      .td(
        v-if="moveIdx < moves.length-1"
        :class="{'highlight-lm': cursor == moveIdx+1}"
        @click="() => gotoMove(moveIdx+1)"
        v-html="notation(moveIdx + 1)")
</template>

<script>
import { store } from "@/store";
import { getFullNotation } from "@/utils/notation";
import { processModalClick } from "@/utils/modalClick";
export default {
  name: "my-move-list",
  props: [
    "moves", "show", "canAnalyze", "canDownload",
    "vname", "cursor", "score", "message", "firstNum"],
  data: function() {
    return {
      st: store.state
    };
  },
  mounted: function() {
    document.getElementById("adjuster")
      .addEventListener("click", processModalClick);
    // Take full width on small screens:
    let boardSize =
      window.innerWidth >= 768
        ? 0.75 * Math.min(window.innerWidth, window.innerHeight)
        : window.innerWidth;
    const movesWidth = window.innerWidth >= 768 ? 280 : 0;
    document.getElementById("boardContainer").style.width = boardSize + "px";
    let gameContainer = document.getElementById("gameContainer");
    gameContainer.style.width = boardSize + movesWidth + "px";
    document.getElementById("boardSize").value =
      (boardSize * 100) / (window.innerWidth - movesWidth);
    window.addEventListener("resize", this.adjustBoard);
    // TODO: find sometjhing better than next height adjustment...
    // maybe each variant could give its ratio (?!)
    setTimeout( () => { this.adjustBoard("vertical"); }, 1000);
  },
  beforeDestroy: function() {
    window.removeEventListener("resize", this.adjustBoard);
  },
  watch: {
    cursor: function(newCursor) {
      if (window.innerWidth <= 767) return; //scrolling would hide chessboard
      // $nextTick to wait for table > tr to be rendered
      this.$nextTick(() => {
        let curMove = document.querySelector(".td.highlight-lm");
        if (!curMove && this.moves.length > 0) {
          // Cursor is before game beginning, and some moves were made:
          curMove =
            document.querySelector(".moves-list > .tr:first-child > .td");
        }
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
    },
    btnRulesClass: function() {
      // "rr" for "rules read"
      return {
        highlightRules:
          !!this.vname && !localStorage.getItem("rr_" + this.vname)
      };
    }
  },
  methods: {
    notation: function(moveIdx) {
      const move = this.moves[moveIdx];
      if (this.score != "*") return getFullNotation(move);
      if (
        ['none','highlight'].includes(this.show) ||
        (
          this.show == "byrow" &&
          moveIdx == this.moves.length-1 &&
          moveIdx % 2 == 0
        )
      ) {
        return "?";
      }
      return getFullNotation(move);
    },
    btnTooltipClass: function() {
      return { tooltip: !("ontouchstart" in window) };
    },
    clickRulesBtn: function() {
      const key = "rr_" + this.vname;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        document.getElementById("rulesBtn").classList.remove("highlightRules");
      }
      this.$emit("showrules");
    },
    gotoMove: function(index) {
      // Goto move except if click on current move:
      if (this.cursor != index) this.$emit("goto-move", index);
    },
    adjustBoard: function(vertical) {
      const boardContainer = document.getElementById("boardContainer");
      if (!boardContainer) return; //no board on page
      const movesWidth = window.innerWidth >= 768 ? 280 : 0;
      let gameContainer = document.getElementById("gameContainer");
      if (vertical) {
        const bRect =
          document.getElementById("rootBoardElement").getBoundingClientRect();
        if (bRect.bottom > window.innerHeight) {
          const maxHeight = window.innerHeight - 20;
          gameContainer.style.height = maxHeight + "px";
          const boardSize = maxHeight * bRect.width / bRect.height;
          boardContainer.style.width = boardSize + "px";
          gameContainer.style.width = boardSize + movesWidth + "px";
          this.$emit("redraw-board");
          setTimeout( () => window.scroll(0, bRect.top), 1000);
        }
      }
      else {
        const k = document.getElementById("boardSize").value;
        const minBoardWidth = 160; //TODO: these 160 and 280 are arbitrary...
        // Value of 0 is board min size; 100 is window.width [- movesWidth]
        const boardSize =
          minBoardWidth +
          (k * (window.innerWidth - (movesWidth + minBoardWidth))) / 100;
        boardContainer.style.width = boardSize + "px";
        gameContainer.style.width = boardSize + movesWidth + "px";
        this.$emit("redraw-board");
      }
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

.highlightRules
  padding: 3px 5px
  background-color: yellow

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
  &.active
    background-color: #48C9B0

#aboveMoves button
  padding-bottom: 5px
</style>
