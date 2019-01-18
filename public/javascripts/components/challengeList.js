Vue.component("my-challenge-list", {
	props: ["challenges"],
	computed: {
		showVariant: function() {
			this.challenges.length > 0 && !!this.challenges[0].variant;
		},
		showNbPlayers: function() {
			this.challenges.length > 0 && !!this.challenges[0].nbPlayers;
		},
	},
	template: `
		<table>
			<tr>
				<th v-if="showVariant">Variant</th>
				<th>From</th>
				<th>To</th>
				<th>Cadence</th>
				<th v-if="showNbPlayers">Number of players</th>
			</tr>
			<tr v-for="c in challenges" @click="$emit('click-challenge',c)">
				<td v-if="showVariant">{{ c.variant }}</td>
				<td>{{ c.from.name }}</td>
				<td>
					<span v-for="p in c.to">{{ p.name }}</span>
				</td>
				<td>{{ c.mainTime }} + {{ c.increment }}</td>
				<td v-if="showNbPlayers">{{ c.nbPlayers }}</td>
			</tr>
		</table>
	`,
});

// TODO: challenge format from/to ou uid/players ............
