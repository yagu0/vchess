<template lang="pug">
table
  tr
    th Variant
    th Players names
    th Cadence
    th(v-if="showResult") Result
    th(v-else) Moves count
  tr(v-for="g in games" @click="$emit('show-game',g)")
    td {{ g.vname }}
    td
      span(v-for="p in g.players") {{ p.name }}
    td {{ g.mainTime }} + {{ g.increment }}
    td(v-if="showResult") {{ g.score }}
    td(v-else) {{ g.movesCount }}
</template>

<script>
export default {
  name: "my-game-list",
	props: ["games"],
	computed: {
		showResult: function() {
			return this.games.length > 0 && this.games[0].score != "*";
		},
	},
};
</script>
