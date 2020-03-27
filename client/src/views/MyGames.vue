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
        ref="livegames"
        v-show="display=='live'"
        :games="liveGames"
        @show-game="showGame"
        @abortgame="abortGame"
      )
      GameList(
        v-show="display=='corr'"
        ref="corrgames"
        :games="corrGames"
        @show-game="showGame"
        @abortgame="abortGame"
      )
      button#loadMoreBtn(
        v-show="hasMore[display]"
        @click="loadMore(display)"
      )
        | {{ st.tr["Load more"] }}
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
      // timestamp of last showed (oldest) game:
      cursor: {
        live: Number.MAX_SAFE_INTEGER,
        corr: Number.MAX_SAFE_INTEGER
      },
      // hasMore == TRUE: a priori there could be more games to load
      hasMore: { live: true, corr: store.state.user.id > 0 },
      conn: null,
      connexionString: "",
      socketCloseListener: 0
    };
  },
  watch: {
    $route: function(to, from) {
      if (to.path != "/mygames") this.cleanBeforeDestroy();
    }
  },
  created: function() {
    window.addEventListener("beforeunload", this.cleanBeforeDestroy);
    // Initialize connection
    this.connexionString =
      params.socketUrl +
      "/?sid=" + this.st.user.sid +
      "&id=" + this.st.user.id +
      "&tmpId=" + getRandString() +
      "&page=" +
      encodeURIComponent(this.$route.path);
    this.conn = new WebSocket(this.connexionString);
    this.conn.onmessage = this.socketMessageListener;
    this.socketCloseListener = setInterval(
      () => {
        if (this.conn.readyState == 3) {
          // Connexion is closed: re-open
          this.conn.removeEventListener("message", this.socketMessageListener);
          this.conn = new WebSocket(this.connexionString);
          this.conn.addEventListener("message", this.socketMessageListener);
        }
      },
      1000
    );
  },
  mounted: function() {
    const adjustAndSetDisplay = () => {
      // showType is the last type viwed by the user (default)
      let showType = localStorage.getItem("type-myGames") || "live";
      // Live games, my turn: highest priority:
      if (this.liveGames.some(g => !!g.myTurn)) showType = "live";
      // Then corr games, my turn:
      else if (this.corrGames.some(g => !!g.myTurn)) showType = "corr";
      else {
        // If a listing is empty, try showing the other (if non-empty)
        const types = ["corr", "live"];
        for (let i of [0,1]) {
          if (
            this[types[i] + "Games"].length > 0 &&
            this[types[1-i] + "Games"].length == 0
          ) {
            showType = types[i];
          }
        }
      }
      this.setDisplay(showType);
    };
    GameStorage.getRunning(localGames => {
      localGames.forEach(g => g.type = "live");
      this.decorate(localGames);
      this.liveGames = localGames;
      if (this.st.user.id > 0) {
        // Ask running corr games first
        ajax(
          "/runninggames",
          "GET",
          {
            credentials: true,
            success: (res) => {
              // These games are garanteed to not be deleted
              this.corrGames = res.games;
              this.corrGames.forEach(g => {
                g.type = "corr";
                g.score = "*";
              });
              this.decorate(this.corrGames);
              // Now ask completed games (partial list)
              this.loadMore(
                "live",
                () => this.loadMore("corr", adjustAndSetDisplay)
              );
            }
          }
        );
      } else this.loadMore("live", adjustAndSetDisplay);
    });
  },
  beforeDestroy: function() {
    this.cleanBeforeDestroy();
  },
  methods: {
    cleanBeforeDestroy: function() {
      clearInterval(this.socketCloseListener);
      window.removeEventListener("beforeunload", this.cleanBeforeDestroy);
      this.conn.removeEventListener("message", this.socketMessageListener);
      this.conn.send(JSON.stringify({code: "disconnect"}));
      this.conn = null;
    },
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
    // Called at loading to augment games with myColor + myTurn infos
    decorate: function(games) {
      games.forEach(g => {
        g.myColor =
          (g.type == "corr" && g.players[0].id == this.st.user.id) ||
          (g.type == "live" && g.players[0].sid == this.st.user.sid)
            ? 'w'
            : 'b';
        // If game is over, myTurn doesn't exist:
        if (g.score == "*") {
          const rem = g.movesCount % 2;
          if ((rem == 0 && g.myColor == 'w') || (rem == 1 && g.myColor == 'b'))
            g.myTurn = true;
        }
      });
    },
    socketMessageListener: function(msg) {
      if (!this.conn) return;
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
          if (thing == "turn") {
            game.myTurn = !game.myTurn;
            if (game.myTurn) this.tryShowNewsIndicator(type);
          } else game.myTurn = false;
          // TODO: forcing refresh like that is ugly and wrong.
          //       How to do it cleanly?
          this.$refs[type + "games"].$forceUpdate();
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
          game.myTurn =
            (type == "corr" && game.players[0].id == this.st.user.id) ||
            (type == "live" && game.players[0].sid == this.st.user.sid);
          gamesArrays[type].push(game);
          if (game.myTurn) this.tryShowNewsIndicator(type);
          // TODO: cleaner refresh
          this.$refs[type + "games"].$forceUpdate();
          break;
        }
      }
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
        if (!!this.conn) {
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
    },
    loadMore: function(type, cb) {
      if (type == "corr" && this.st.user.id > 0) {
        ajax(
          "/completedgames",
          "GET",
          {
            credentials: true,
            data: { cursor: this.cursor["corr"] },
            success: (res) => {
              const L = res.games.length;
              if (L > 0) {
                this.cursor["corr"] = res.games[L - 1].created;
                let moreGames = res.games;
                moreGames.forEach(g => g.type = "corr");
                this.decorate(moreGames);
                this.corrGames = this.corrGames.concat(moreGames);
              } else this.hasMore["corr"] = false;
              if (!!cb) cb();
            }
          }
        );
      } else if (type == "live") {
        GameStorage.getNext(this.cursor["live"], localGames => {
          const L = localGames.length;
          if (L > 0) {
            // Add "-1" because IDBKeyRange.upperBound includes boundary
            this.cursor["live"] = localGames[L - 1].created - 1;
            localGames.forEach(g => g.type = "live");
            this.decorate(localGames);
            this.liveGames = this.liveGames.concat(localGames);
          } else this.hasMore["live"] = false;
          if (!!cb) cb();
        });
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

button#loadMoreBtn
  display: block
  margin: 0 auto

.somethingnew
  background-color: #c5fefe !important
</style>
