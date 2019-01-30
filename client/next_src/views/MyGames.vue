<template>
  <div class="about">
    <h1>This is an about page</h1>
  </div>
</template>
// "My" games: tabs my archived local games, my correspondance games
// + my imported games (of any type).
// TODO: later, also add possibility to upload a game (parse PGN).
Vue.component("my-tab-games", {
	props: ["settings"],
	data: function() {
		return {
			display: "",
			imported: [],
			local: [],
			corr: []
		};
	},
	template: `
		<div>
			<div class="button-group">
				<button @click="display='local'">Local games</button>
				<button @click="display='corr'">Correspondance games</button>
				<button @click="display='imported'">Imported games</button>
			</div>
			<my-game-list v-show="display=='local'" :games="local">
			</my-game-list>
			<my-game-list v-show="display=='corr'" :games="corr">
			</my-game-list>
			<my-game-list v-show="display=='imported'" :games="imported">
			</my-game-list>
			<button @click="update">Refresh</button>
		</div>
	`,
	created: function() {
		// TODO: fetch corr games, local and corr
		// if any corr game where it's my turn, set display = "corr",
		// else set display = "local" (if any) or imported (if any and no local)
	},
	methods: {
		update: function() {
			// TODO: scan local + imported games, if any new then add it
		},
	},
});
