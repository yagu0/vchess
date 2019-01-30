Vue.component("my-game-list", {
	props: ["games"],
	computed: {
		showVariant: function() {
			return this.games.length > 0 && !!this.games[0].vname;
		},
		showResult: function() {
			return this.games.length > 0 && this.games[0].score != "*";
		},
	},
	template: `
		<table>
			<tr>
				<th v-if="showVariant">Variant</th>
				<th>Players names</th>
				<th>Cadence</th>
				<th v-if="showResult">Result</th>
			</tr>
			<tr v-for="g in games" @click="$emit('show-game',g)">
				<td v-if="showVariant">{{ g.vname }}</td>
				<td>
					<span v-for="p in g.players">{{ p.name }}</span>
				</td>
				<td>{{ g.mainTime }} + {{ g.increment }}</td>
				<td v-if="showResult">{{ g.score }}</td>
			</tr>
		</table>
	`,
});
