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
    td {{ g.players[0].name || "@nonymous" }}
    td {{ g.players[1].name || "@nonymous" }}
    td {{ g.timeControl }}
    td(v-if="showResult") {{ g.score }}
</template>

<script>
export default {
  name: "my-game-list",
	props: ["games"],
	computed: {
		showResult: function() {
			return this.games.some(g => g.score != "*");
		},
	},
};
</script>
