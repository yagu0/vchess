<template lang="pug">
table
  tr
    th(v-if="showVariant") Variant
    th Players names
    th Cadence
    th(v-if="showResult") Result
  tr(v-for="g in games" @click="$emit('show-game',g)")
    td(v-if="showVariant") {{ g.vname }}
    td
      span(v-for="p in g.players") {{ p.name }}
    td {{ g.mainTime }} + {{ g.increment }}
    td(v-if="showResult") {{ g.score }}
</template>

<script>
export default {
  name: "my-game-list",
	props: ["games"],
	computed: {
		showVariant: function() {
			return this.games.length > 0 && !!this.games[0].vname;
		},
		showResult: function() {
			return this.games.length > 0 && this.games[0].score != "*";
		},
	},
};
</script>
