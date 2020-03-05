<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button.tabbtn#liveGames(@click="setDisplay('live',$event)")
          | {{ st.tr["Live games"] }}
        button.tabbtn#corrGames(@click="setDisplay('corr',$event)")
          | {{ st.tr["Correspondance games"] }}
      GameList(
        v-show="display=='live'"
        :games="liveGames"
        @show-game="showGame"
      )
      GameList(
        v-show="display=='corr'"
        :games="corrGames"
        @show-game="showGame"
      )
</template>

<script>
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ajax } from "@/utils/ajax";
import params from "@/parameters";
import { getRandString } from "@/utils/alea";
import GameList from "@/components/GameList.vue";
export default {
  name: "my-my-games",
  components: {
    GameList
  },
  data: function() {
    return {
      st: store.state,
      display: "live",
      liveGames: [],
      corrGames: [],
      conn: null,
      connexionString: ""
    };
  },
  created: function() {
    GameStorage.getAll(true, localGames => {
      localGames.forEach(g => (g.type = this.classifyObject(g)));
      this.liveGames = localGames;
    });
    if (this.st.user.id > 0) {
      ajax("/games", "GET", { uid: this.st.user.id }, res => {
        res.games.forEach(g => (g.type = this.classifyObject(g)));
        this.corrGames = res.games;
      });
    }
    // Initialize connection
    this.connexionString =
      params.socketUrl +
      "/?sid=" +
      this.st.user.sid +
      "&tmpId=" +
      getRandString() +
      "&page=" +
      encodeURIComponent(this.$route.path);
    this.conn = new WebSocket(this.connexionString);
    this.conn.onmessage = this.socketMessageListener;
    this.conn.onclose = this.socketCloseListener;
  },
  mounted: function() {
    const showType = localStorage.getItem("type-myGames") || "live";
    this.setDisplay(showType);
  },
  beforeDestroy: function() {
    this.conn.send(JSON.stringify({code: "disconnect"}));
  },
  methods: {
    setDisplay: function(type, e) {
      this.display = type;
      localStorage.setItem("type-myGames", type);
      let elt = e ? e.target : document.getElementById(type + "Games");
      elt.classList.add("active");
      elt.classList.remove("somethingnew"); //in case of
      if (elt.previousElementSibling)
        elt.previousElementSibling.classList.remove("active");
      else elt.nextElementSibling.classList.remove("active");
    },
    // TODO: classifyObject is redundant (see Hall.vue)
    classifyObject: function(o) {
      return o.cadence.indexOf("d") === -1 ? "live" : "corr";
    },
    showGame: function(g) {
      this.$router.push("/game/" + g.id);
    },
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      if (data.code == "changeturn") {
        let games = !!parseInt(data.gid)
          ? this.corrGames
          : this.liveGames;
        // NOTE: new move itself is not received, because it wouldn't be used.
        let g = games.find(g => g.id == data.gid);
        this.$set(g, "movesCount", g.movesCount + 1);
        if (
          (g.type == "live" && this.display == "corr") ||
          (g.type == "corr" && this.display == "live")
        ) {
          document
            .getElementById(g.type + "Games")
            .classList.add("somethingnew");
        }
      }
    },
    socketCloseListener: function() {
      this.conn = new WebSocket(this.connexionString);
      this.conn.addEventListener("message", this.socketMessageListener);
      this.conn.addEventListener("close", this.socketCloseListener);
    }
  }
};
</script>

<style lang="sass">
.active
  color: #42a983

.tabbtn
  background-color: #f9faee

table.game-list
  max-height: 100%

.somethingnew
  background-color: #c5fefe !important
</style>
