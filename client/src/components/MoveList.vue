<template lang="pug">
div
  #scoreInfo(v-if="score!='*'")
    p {{ score }}
    p {{ message }}
  .moves-list
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
      // Else: just add an empty cell
      //.td(v-else)
</template>

<script>
import { store } from "@/store";
import { getFullNotation } from "@/utils/notation";
export default {
  name: "my-move-list",
  props: ["moves", "show", "cursor", "score", "message", "firstNum"],
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
