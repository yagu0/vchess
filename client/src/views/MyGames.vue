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
        @abortgame="abortGame"
      )
      GameList(
        v-show="display=='corr'"
        :games="corrGames"
        @show-game="showGame"
        @abortgame="abortGame"
      )
</template>

<script>
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ajax } from "@/utils/ajax";
import { getScoreMessage } from "@/utils/scoring";
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
      localGames.forEach(g => g.type = "live");
      this.decorate(localGames);
      this.liveGames = localGames;
    });
    if (this.st.user.id > 0) {
      ajax(
        "/games",
        "GET",
        {
          data: { uid: this.st.user.id },
          success: (res) => {
            let serverGames = res.games.filter(g => {
              const mySide =
                g.players[0].uid == this.st.user.id
                  ? "White"
                  : "Black";
              return !g["deletedBy" + mySide];
            });
            serverGames.forEach(g => g.type = "corr");
            this.decorate(serverGames);
            this.corrGames = serverGames;
          }
        }
      );
    }
    // Initialize connection
    this.connexionString =
      params.socketUrl +
      "/?sid=" +
      this.st.user.sid +
      "&id=" +
      this.st.user.id +
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
    tryShowNewsIndicator: function(type) {
      if (
        (type == "live" && this.display == "corr") ||
        (type == "corr" && this.display == "live")
      ) {
        document
          .getElementById(type + "Games")
          .classList.add("somethingnew");
      }
    },
    // Called at loading to augment games with priority + myTurn infos
    decorate: function(games) {
      games.forEach(g => {
        g.priority = 0;
        if (g.score == "*") {
          g.priority++;
          const myColor =
            (g.type == "corr" && g.players[0].uid == this.st.user.id) ||
            (g.type == "live" && g.players[0].sid == this.st.user.sid)
              ? 'w'
              : 'b';
          const rem = g.movesCount % 2;
          if ((rem == 0 && myColor == 'w') || (rem == 1 && myColor == 'b')) {
            g.myTurn = true;
            g.priority++;
          }
        }
      });
    },
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      let gamesArrays = {
        "corr": this.corrGames,
        "live": this.liveGames
      };
      switch (data.code) {
        case "notifyturn":
        case "notifyscore": {
          const info = data.data;
          const type = (!!parseInt(info.gid) ? "corr" : "live");
          let game = gamesArrays[type].find(g => g.id == info.gid);
          // "notifything" --> "thing":
          const thing = data.code.substr(6);
          game[thing] = info[thing];
          if (thing == "score") game.priority = 0;
          else {
            game.priority = 3 - game.priority; //toggle turn
            game.myTurn = !game.myTurn;
          }
          this.$forceUpdate();
          this.tryShowNewsIndicator(type);
          break;
        }
        case "notifynewgame": {
          const gameInfo = data.data;
          // st.variants might be uninitialized,
          // if unlucky and newgame right after connect:
          const v = this.st.variants.find(v => v.id == gameInfo.vid);
          const vname = !!v ? v.name : "";
          const type = (gameInfo.cadence.indexOf('d') >= 0 ? "corr": "live");
          let game = Object.assign(
            {
              vname: vname,
              type: type,
              score: "*",
              created: Date.now()
            },
            gameInfo
          );
          // Compute priority:
          game.priority = 1; //at least: my running game
          if (
            (type == "corr" && game.players[0].uid == this.st.user.id) ||
            (type == "live" && game.players[0].sid == this.st.user.sid)
          ) {
            game.priority++;
            game.myTurn = true;
          }
          gamesArrays[type].push(game);
          this.$forceUpdate();
          this.tryShowNewsIndicator(type);
          break;
        }
      }
    },
    socketCloseListener: function() {
      this.conn = new WebSocket(this.connexionString);
      this.conn.addEventListener("message", this.socketMessageListener);
      this.conn.addEventListener("close", this.socketCloseListener);
    },
    showGame: function(game) {
      if (game.type == "live" || !game.myTurn) {
        this.$router.push("/game/" + game.id);
        return;
      }
      // It's my turn in this game. Are there others?
      let nextIds = "";
      let otherCorrGamesMyTurn = this.corrGames.filter(g =>
        g.id != game.id && !!g.myTurn);
      if (otherCorrGamesMyTurn.length > 0) {
        nextIds += "/?next=[";
        otherCorrGamesMyTurn.forEach(g => { nextIds += g.id + ","; });
        // Remove last comma and close array:
        nextIds = nextIds.slice(0, -1) + "]";
      }
      this.$router.push("/game/" + game.id + nextIds);
    },
    abortGame: function(game) {
      // Special "trans-pages" case: from MyGames to Game
      // TODO: also for corr games? (It's less important)
      if (game.type == "live") {
        const oppsid =
          game.players[0].sid == this.st.user.sid
            ? game.players[1].sid
            : game.players[0].sid;
        this.conn.send(
          JSON.stringify(
            {
              code: "mabort",
              gid: game.id,
              // NOTE: target might not be online
              target: oppsid
            }
          )
        );
      }
      else if (!game.deletedByWhite || !game.deletedByBlack) {
        // Set score if game isn't deleted on server:
        ajax(
          "/games",
          "PUT",
          {
            data: {
              gid: game.id,
              newObj: {
                score: "?",
                scoreMsg: getScoreMessage("?")
              }
            }
          }
        );
      }
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
