<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button(@click="display='live'") Live games
        button(@click="display='corr'") Correspondance games
      GameList(v-show="display=='live'" :games="filterGames('live')"
        @show-game="showGame")
      GameList(v-show="display=='corr'" :games="filterGames('corr')"
        @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ajax } from "@/utils/ajax";
import GameList from "@/components/GameList.vue";

export default {
  name: "my-games",
  components: {
    GameList,
  },
  data: function() {
    return {
      st: store.state,
			display: "live",
      games: [],
    };
  },
  created: function() {
    GameStorage.getAll((localGames) => {
      localGames.forEach((g) => g.type = this.classifyObject(g));
      Array.prototype.push.apply(this.games, localGames);
    });
    if (this.st.user.id > 0)
    {
      ajax("/games", "GET", {uid: this.st.user.id}, (res) => {
        res.games.forEach((g) => g.type = this.classifyObject(g));
        //Array.prototype.push.apply(this.games, res.games); //TODO: Vue 3
        this.games = this.games.concat(res.games);
      });
    }
  },
  methods: {
    // TODO: classifyObject and filterGames are redundant (see Hall.vue)
    classifyObject: function(o) {
      return (o.timeControl.indexOf('d') === -1 ? "live" : "corr");
    },
    filterGames: function(type) {
      return this.games.filter(g => g.type == type);
    },
    showGame: function(g) {
      this.$router.push("/game/" + g.id);
    },
  },
};
</script>

<style scoped lang="sass">
/* TODO */
</style>
