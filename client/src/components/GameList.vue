<template lang="pug">
table
  tr
    th Variant
    th White
    th Black
    th Time control
    th(v-if="showResult") Result
  tr(v-for="g in games" @click="$emit('show-game',g)")
    td {{ g.vname }}
    td {{ g.players[0] }}
    td {{ g.players[1] }}
    td {{ g.timeControl }}
    td(v-if="showResult") {{ g.score }}
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
