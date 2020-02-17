<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button.tabbtn#liveGames(@click="setDisplay('live',$event)") {{ st.tr["Live games"] }}
        button.tabbtn#corrGames(@click="setDisplay('corr',$event)") {{ st.tr["Correspondance games"] }}
      GameList(v-show="display=='live'" :games="liveGames"
        @show-game="showGame")
      GameList(v-show="display=='corr'" :games="corrGames"
        @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ajax } from "@/utils/ajax";
import GameList from "@/components/GameList.vue";
export default {
  name: "my-my-games",
  components: {
    GameList,
  },
  data: function() {
    return {
      st: store.state,
      display: "live",
      liveGames: [],
      corrGames: [],
    };
  },
  created: function() {
    GameStorage.getAll((localGames) => {
      localGames.forEach((g) => g.type = this.classifyObject(g));
      this.liveGames = localGames;
    });
    if (this.st.user.id > 0)
    {
      ajax("/games", "GET", {uid: this.st.user.id}, (res) => {
        res.games.forEach((g) => g.type = this.classifyObject(g));
        this.corrGames = res.games;
      });
    }
  },
  mounted: function() {
    const showType = localStorage.getItem("type-myGames") || "live";
    this.setDisplay(showType);
  },
  methods: {
    setDisplay: function(type, e) {
      this.display = type;
      localStorage.setItem("type-myGames", type);
      let elt = !!e
        ? e.target
        : document.getElementById(type + "Games");
      elt.classList.add("active");
      if (!!elt.previousElementSibling)
        elt.previousElementSibling.classList.remove("active");
      else
        elt.nextElementSibling.classList.remove("active");
    },
    // TODO: classifyObject is redundant (see Hall.vue)
    classifyObject: function(o) {
      return (o.cadence.indexOf('d') === -1 ? "live" : "corr");
    },
    showGame: function(g) {
      this.$router.push("/game/" + g.id);
    },
  },
};
</script>

<style lang="sass" scoped>
.active
  color: #42a983

.tabbtn
  background-color: #f9faee
</style>
