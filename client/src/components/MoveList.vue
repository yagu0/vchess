<template lang="pug">
div
  #scoreInfo(v-if="score!='*'")
    p {{ score }}
    p {{ message }}
  table#movesList
    tbody
      tr(v-for="moveIdx in evenNumbers")
        td {{ firstNum + moveIdx / 2 + 1 }}
        td(:class="{'highlight-lm': cursor == moveIdx}"
            @click="() => gotoMove(moveIdx)")
          | {{ moves[moveIdx].notation }}
        td(v-if="moveIdx < moves.length-1"
            :class="{'highlight-lm': cursor == moveIdx+1}"
            @click="() => gotoMove(moveIdx+1)")
          | {{ moves[moveIdx+1].notation }}
        // Else: just add an empty cell
        td(v-else)
</template>

<script>
// Component for moves list on the right
export default {
  name: 'my-move-list',
	props: ["moves","cursor","score","message","firstNum"],
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
