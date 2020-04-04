<template lang="pug">
main
  input#modalInfo.modal(type="checkbox")
  div#infoDiv(
    role="dialog"
    data-checkbox="modalInfo"
  )
    .card.text-center
      label.modal-close(for="modalInfo")
      a(
        :href="'#/game/' + rematchId"
        onClick="document.getElementById('modalInfo').checked=false"
      )
        | {{ st.tr["Rematch in progress"] }}
  input#modalChat.modal(
    type="checkbox"
    @click="toggleChat()"
  )
  div#chatWrap(
    role="dialog"
    data-checkbox="modalChat"
  )
    .card
      label.modal-close(for="modalChat")
      #participants
        span {{ st.tr["Participant(s):"] }} 
        span(
          v-for="p in Object.values(people)"
          v-if="participateInChat(p)"
        )
          | {{ p.name }} 
        span.anonymous(v-if="someAnonymousPresent()") + @nonymous
      Chat(
        ref="chatcomp"
        :players="game.players"
        :pastChats="game.chats"
        @mychat="processChat"
        @chatcleared="clearChat"
      )
  input#modalConfirm.modal(type="checkbox")
  div#confirmDiv(role="dialog")
    .card
      .diagram(
        v-if="!!vr && ['all','byrow'].includes(vr.showMoves)"
        v-html="curDiag"
      )
      p.text-center(v-else)
        span {{ st.tr["Move played:"] + " " }}
        span.bold {{ moveNotation }}
        br
        span {{ st.tr["Are you sure?"] }}
      .button-group#buttonsConfirm
        // onClick for acceptBtn: set dynamically
        button.acceptBtn
          span {{ st.tr["Validate"] }}
        button.refuseBtn(@click="cancelMove()")
          span {{ st.tr["Cancel"] }}
  .row
    #aboveBoard.col-sm-12.col-md-9.col-md-offset-3.col-lg-10.col-lg-offset-2
      span.variant-cadence(v-if="game.type!='import'") {{ game.cadence }}
      span.variant-name {{ game.vname }}
      span#nextGame(
        v-if="nextIds.length > 0"
        @click="showNextGame()"
      )
        | {{ st.tr["Next_g"] }}
      button#chatBtn.tooltip(
        onClick="window.doClick('modalChat')"
        aria-label="Chat"
      )
        img(src="/images/icons/chat.svg")
      #actions(v-if="game.score=='*'")
        button.tooltip(
          @click="clickDraw()"
          :class="{['draw-' + drawOffer]: true}"
          :aria-label="st.tr['Draw']"
        )
          img(src="/images/icons/draw.svg")
        button.tooltip(
          v-if="!!game.mycolor"
          @click="abortGame()"
          :aria-label="st.tr['Abort']"
        )
          img(src="/images/icons/abort.svg")
        button.tooltip(
          v-if="!!game.mycolor"
          @click="resign()"
          :aria-label="st.tr['Resign']"
        )
          img(src="/images/icons/resign.svg")
      button.tooltip(
        v-else
        @click="clickRematch()"
        :class="{['rematch-' + rematchOffer]: true}"
        :aria-label="st.tr['Rematch']"
      )
        img(src="/images/icons/rematch.svg")
      #playersInfo
        p(v-if="isLargeScreen()")
          span.name(:class="{connected: isConnected(0)}")
            | {{ game.players[0].name || "@nonymous" }}
          span.time(
            v-if="game.score=='*'"
            :class="{yourturn: !!vr && vr.turn == 'w'}"
          )
            span.time-left {{ virtualClocks[0][0] }}
            span.time-separator(v-if="!!virtualClocks[0][1]") :
            span.time-right(v-if="!!virtualClocks[0][1]")
              | {{ virtualClocks[0][1] }}
          span.split-names -
          span.name(:class="{connected: isConnected(1)}")
            | {{ game.players[1].name || "@nonymous" }}
          span.time(
            v-if="game.score=='*'"
            :class="{yourturn: !!vr && vr.turn == 'b'}"
          )
            span.time-left {{ virtualClocks[1][0] }}
            span.time-separator(v-if="!!virtualClocks[1][1]") :
            span.time-right(v-if="!!virtualClocks[1][1]")
              | {{ virtualClocks[1][1] }}
        p(v-else)
          span.name(:class="{connected: isConnected(0)}")
            | {{ game.players[0].name || "@nonymous" }}
          span.split-names -
          span.name(:class="{connected: isConnected(1)}")
            | {{ game.players[1].name || "@nonymous" }}
          br
          span.time(
            v-if="game.score=='*'"
            :class="{yourturn: !!vr && vr.turn == 'w'}"
          )
            span.time-left {{ virtualClocks[0][0] }}
            span.time-separator(v-if="!!virtualClocks[0][1]") :
            span.time-right(v-if="!!virtualClocks[0][1]")
              | {{ virtualClocks[0][1] }}
          span.time(
            v-if="game.score=='*'"
            :class="{yourturn: !!vr && vr.turn == 'b'}"
          )
            span.time-left {{ virtualClocks[1][0] }}
            span.time-separator(v-if="!!virtualClocks[1][1]") :
            span.time-right(v-if="!!virtualClocks[1][1]")
              | {{ virtualClocks[1][1] }}
  BaseGame(
    ref="basegame"
    :game="game"
    @newmove="processMove"
  )
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import Chat from "@/components/Chat.vue";
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ImportgameStorage } from "@/utils/importgameStorage";
import { ppt } from "@/utils/datetime";
import { notify } from "@/utils/notifications";
import { ajax } from "@/utils/ajax";
import { extractTime } from "@/utils/timeControl";
import { getRandString } from "@/utils/alea";
import { getScoreMessage } from "@/utils/scoring";
import { getFullNotation } from "@/utils/notation";
import { getDiagram } from "@/utils/printDiagram";
import { processModalClick } from "@/utils/modalClick";
import { playMove, getFilteredMove } from "@/utils/playUndo";
import { ArrayFun } from "@/utils/array";
import params from "@/parameters";
export default {
  name: "my-game",
  components: {
    BaseGame,
    Chat
  },
  data: function() {
    return {
      st: store.state,
      // gameRef can point to a corr game, local game or remote live game
      gameRef: "",
      nextIds: [],
      game: {}, //passed to BaseGame
      focus: !document.hidden, //will not always work... TODO
      // virtualClocks will be initialized from true game.clocks
      virtualClocks: [],
      vr: null, //"variant rules" object initialized from FEN
      drawOffer: "",
      rematchId: "",
      rematchOffer: "",
      lastateAsked: false,
      people: {}, //players + observers
      lastate: undefined, //used if opponent send lastate before game is ready
      repeat: {}, //detect position repetition
      curDiag: "", //for corr moves confirmation
      conn: null,
      roomInitialized: false,
      // If newmove has wrong index: ask fullgame again:
      askGameTime: 0,
      gameIsLoading: false,
      // If asklastate got no reply, ask again:
      gotLastate: false,
      gotMoveIdx: -1, //last move index received
      // If newmove got no pingback, send again:
      opponentGotMove: false,
      connexionString: "",
      socketCloseListener: 0,
      // Incomplete info games: show move played
      moveNotation: "",
      // Intervals from setInterval():
      askLastate: null,
      retrySendmove: null,
      clockUpdate: null,
      // Related to (killing of) self multi-connects:
      newConnect: {}
    };
  },
  watch: {
    $route: function(to, from) {
      if (to.path.length < 6 || to.path.substr(0, 6) != "/game/")
        // Page change
        this.cleanBeforeDestroy();
      else if (from.params["id"] != to.params["id"]) {
        // Change everything:
        this.cleanBeforeDestroy();
        let boardDiv = document.querySelector(".game");
        if (!!boardDiv)
          // In case of incomplete information variant:
          boardDiv.style.visibility = "hidden";
        this.atCreation();
      } else
        // Same game ID
        this.nextIds = JSON.parse(this.$route.query["next"] || "[]");
    }
  },
  // NOTE: some redundant code with Hall.vue (mostly related to people array)
  created: function() {
    this.atCreation();
  },
  mounted: function() {
    document.getElementById("chatWrap")
      .addEventListener("click", (e) => {
        processModalClick(e, () => {
          this.toggleChat("close")
        });
      });
    document.getElementById("infoDiv")
      .addEventListener("click", processModalClick);
    if ("ontouchstart" in window) {
      // Disable tooltips on smartphones:
      document.querySelectorAll("#aboveBoard .tooltip").forEach(elt => {
        elt.classList.remove("tooltip");
      });
    }
  },
  beforeDestroy: function() {
    this.cleanBeforeDestroy();
  },
  methods: {
    cleanBeforeDestroy: function() {
      clearInterval(this.socketCloseListener);
      document.removeEventListener('visibilitychange', this.visibilityChange);
      window.removeEventListener('focus', this.onFocus);
      window.removeEventListener('blur', this.onBlur);
      if (!!this.askLastate) clearInterval(this.askLastate);
      if (!!this.retrySendmove) clearInterval(this.retrySendmove);
      if (!!this.clockUpdate) clearInterval(this.clockUpdate);
      this.conn.removeEventListener("message", this.socketMessageListener);
      this.send("disconnect");
      this.conn = null;
    },
    visibilityChange: function() {
      // TODO: Use document.hidden? https://webplatform.news/issues/2019-03-27
      this.focus = (document.visibilityState == "visible");
      if (!this.focus && !!this.rematchOffer) {
        this.rematchOffer = "";
        this.send("rematchoffer", { data: false });
        // Do not remove rematch offer from (local) storage
      }
      this.send(this.focus ? "getfocus" : "losefocus");
    },
    onFocus: function() {
      this.focus = true;
      this.send("getfocus");
    },
    onBlur: function() {
      this.focus = false;
      if (!!this.rematchOffer) {
        this.rematchOffer = "";
        this.send("rematchoffer", { data: false });
      }
      this.send("losefocus");
    },
    isLargeScreen: function() {
      return window.innerWidth >= 500;
    },
    participateInChat: function(p) {
      return Object.keys(p.tmpIds).some(x => p.tmpIds[x].focus) && !!p.name;
    },
    someAnonymousPresent: function() {
      return (
        Object.values(this.people).some(p =>
          !p.name && Object.keys(p.tmpIds).some(x => p.tmpIds[x].focus)
        )
      );
    },
    atCreation: function() {
      document.addEventListener('visibilitychange', this.visibilityChange);
      window.addEventListener('focus', this.onFocus);
      window.addEventListener('blur', this.onBlur);
      // 0] (Re)Set variables
      this.gameRef = this.$route.params["id"];
      // next = next corr games IDs to navigate faster (if applicable)
      this.nextIds = JSON.parse(this.$route.query["next"] || "[]");
      // Always add myself to players' list
      const my = this.st.user;
      const tmpId = getRandString();
      this.$set(
        this.people,
        my.sid,
        {
          id: my.id,
          name: my.name,
          tmpIds: {
            tmpId: { focus: true }
          }
        }
      );
      this.game = {
        players: [{ name: "" }, { name: "" }],
        chats: [],
        rendered: false
      };
      let chatComp = this.$refs["chatcomp"];
      if (!!chatComp) chatComp.chats = [];
      this.virtualClocks = [[0,0], [0,0]];
      this.vr = null;
      this.drawOffer = "";
      this.lastateAsked = false;
      this.rematchOffer = "";
      this.lastate = undefined;
      this.roomInitialized = false;
      this.askGameTime = 0;
      this.gameIsLoading = false;
      this.gotLastate = false;
      this.gotMoveIdx = -1;
      this.opponentGotMove = false;
      this.askLastate = null;
      this.retrySendmove = null;
      this.clockUpdate = null;
      this.newConnect = {};
      // 1] Initialize connection
      this.connexionString =
        params.socketUrl +
        "/?sid=" + this.st.user.sid +
        "&id=" + this.st.user.id +
        "&tmpId=" + tmpId +
        "&page=" +
        // Discard potential "/?next=[...]" for page indication:
        encodeURIComponent(this.$route.path.match(/\/game\/[a-zA-Z0-9]+/)[0]);
      this.conn = new WebSocket(this.connexionString);
      this.conn.addEventListener("message", this.socketMessageListener);
      this.socketCloseListener = setInterval(
        () => {
          if (this.conn.readyState == 3) {
            this.conn.removeEventListener(
              "message", this.socketMessageListener);
            this.conn = new WebSocket(this.connexionString);
            this.conn.addEventListener("message", this.socketMessageListener);
          }
        },
        1000
      );
      // Socket init required before loading remote game:
      const socketInit = callback => {
        if (this.conn.readyState == 1)
          // 1 == OPEN state
          callback();
        else
          // Socket not ready yet (initial loading)
          // NOTE: first arg is Websocket object, unused here:
          this.conn.onopen = () => callback();
      };
      this.fetchGame((game) => {
        if (!!game)
          this.loadVariantThenGame(game, () => socketInit(this.roomInit));
        else
          // Live game stored remotely: need socket to retrieve it
          // NOTE: the callback "roomInit" will be lost, so it's not provided.
          // --> It will be given when receiving "fullgame" socket event.
          socketInit(() => { this.send("askfullgame"); });
      });
    },
    roomInit: function() {
      if (!this.roomInitialized) {
        // Notify the room only now that I connected, because
        // messages might be lost otherwise (if game loading is slow)
        this.send("connect");
        this.send("pollclients");
        // We may ask fullgame several times if some moves are lost,
        // but room should be init only once:
        this.roomInitialized = true;
      }
    },
    send: function(code, obj) {
      if (!!this.conn && this.conn.readyState == 1)
        this.conn.send(JSON.stringify(Object.assign({ code: code }, obj)));
    },
    isConnected: function(index) {
      const player = this.game.players[index];
      // Is it me ? In this case no need to bother with focus
      if (this.st.user.sid == player.sid || this.st.user.id == player.id)
        // Still have to check for name (because of potential multi-accounts
        // on same browser, although this should be rare...)
        return (!this.st.user.name || this.st.user.name == player.name);
      // Try to find a match in people:
      return (
        (
          !!player.sid &&
          Object.keys(this.people).some(sid => {
            return (
              sid == player.sid &&
              Object.values(this.people[sid].tmpIds).some(v => v.focus)
            );
          })
        )
        ||
        (
          !!player.id &&
          Object.values(this.people).some(p => {
            return (
              p.id == player.id &&
              Object.values(p.tmpIds).some(v => v.focus)
            );
          })
        )
      );
    },
    getOppsid: function() {
      let oppsid = this.game.oppsid;
      if (!oppsid) {
        oppsid = Object.keys(this.people).find(
          sid => this.people[sid].id == this.game.oppid
        );
      }
      // oppsid is useful only if opponent is online:
      if (!!oppsid && !!this.people[oppsid]) return oppsid;
      return null;
    },
    // NOTE: action if provided is always a closing action
    toggleChat: function(action) {
      if (!action && document.getElementById("modalChat").checked)
        // Entering chat
        document.getElementById("inputChat").focus();
      else {
        document.getElementById("chatBtn").classList.remove("somethingnew");
        if (!!this.game.mycolor) {
          // Update "chatRead" variable either on server or locally
          if (this.game.type == "corr")
            this.updateCorrGame({ chatRead: this.game.mycolor });
          else if (this.game.type == "live")
            GameStorage.update(this.gameRef, { chatRead: true });
        }
      }
    },
    processChat: function(chat) {
      this.send("newchat", { data: chat });
      // NOTE: anonymous chats in corr games are not stored on server (TODO?)
      if (!!this.game.mycolor) {
        if (this.game.type == "corr")
          this.updateCorrGame({ chat: chat });
        else {
          // Live game
          chat.added = Date.now();
          GameStorage.update(this.gameRef, { chat: chat });
        }
      }
    },
    clearChat: function() {
      if (!!this.game.mycolor) {
        if (this.game.type == "corr") {
          ajax(
            "/chats",
            "DELETE",
            { data: { gid: this.game.id } }
          );
        } else {
          // Live game
          GameStorage.update(this.gameRef, { delchat: true });
        }
        this.$set(this.game, "chats", []);
      }
    },
    getGameType: function(game) {
      if (!!game.id.toString().match(/^i/)) return "import";
      return game.cadence.indexOf("d") >= 0 ? "corr" : "live";
    },
    // Notify something after a new move (to opponent and me on MyGames page)
    notifyMyGames: function(thing, data) {
      this.send(
        "notify" + thing,
        {
          data: data,
          targets: this.game.players.map(p => {
            return { sid: p.sid, id: p.id };
          })
        }
      );
    },
    showNextGame: function() {
      // Did I play in current game? If not, add it to nextIds list
      if (this.game.score == "*" && this.vr.turn == this.game.mycolor)
        this.nextIds.unshift(this.game.id);
      const nextGid = this.nextIds.pop();
      this.$router.push(
        "/game/" + nextGid + "/?next=" + JSON.stringify(this.nextIds));
    },
    askGameAgain: function() {
      this.gameIsLoading = true;
      const currentUrl = document.location.href;
      const doAskGame = () => {
        if (document.location.href != currentUrl) return; //page change
        this.fetchGame((game) => {
          if (!!game)
            // This is my game: just reload.
            this.loadGame(game);
          else
            // Just ask fullgame again (once!), this is much simpler.
            // If this fails, the user could just reload page :/
            this.send("askfullgame");
        });
      };
      // Delay of at least 2s between two game requests
      const now = Date.now();
      const delay = Math.max(2000 - (now - this.askGameTime), 0);
      this.askGameTime = now;
      setTimeout(doAskGame, delay);
    },
    socketMessageListener: function(msg) {
      if (!this.conn) return;
      const data = JSON.parse(msg.data);
      switch (data.code) {
        case "pollclients":
          // TODO: shuffling and random filtering on server,
          // if the room is really crowded.
          Object.keys(data.sockIds).forEach(sid => {
            if (sid != this.st.user.sid) {
              this.send("askidentity", { target: sid });
              this.people[sid] = { tmpIds: data.sockIds[sid] };
            }
            else {
              // Complete my tmpIds:
              Object.assign(this.people[sid].tmpIds, data.sockIds[sid]);
            }
          });
          break;
        case "connect":
          if (!this.people[data.from[0]]) {
            // focus depends on the tmpId (e.g. tab)
            this.$set(
              this.people,
              data.from[0],
              {
                tmpIds: {
                  [data.from[1]]: { focus: true }
                }
              }
            );
            // For self multi-connects tests:
            this.newConnect[data.from[0]] = true;
            this.send("askidentity", { target: data.from[0] });
          } else {
            this.people[data.from[0]].tmpIds[data.from[1]] = { focus: true };
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        case "disconnect":
          if (!this.people[data.from[0]]) return;
          delete this.people[data.from[0]].tmpIds[data.from[1]];
          if (Object.keys(this.people[data.from[0]].tmpIds).length == 0)
            this.$delete(this.people, data.from[0]);
          else this.$forceUpdate(); //TODO: shouldn't be required
          break;
        case "getfocus": {
          let player = this.people[data.from[0]];
          if (!!player) {
            player.tmpIds[data.from[1]].focus = true;
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        }
        case "losefocus": {
          let player = this.people[data.from[0]];
          if (!!player) {
            player.tmpIds[data.from[1]].focus = false;
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        }
        case "askidentity": {
          // Request for identification
          const me = {
            // Decompose to avoid revealing email
            name: this.st.user.name,
            sid: this.st.user.sid,
            id: this.st.user.id
          };
          this.send("identity", { data: me, target: data.from });
          break;
        }
        case "identity": {
          const user = data.data;
          let player = this.people[user.sid];
          // player.tmpIds is already set
          player.name = user.name;
          player.id = user.id;
          if (this.game.type == "live") {
            const myGidx =
              this.game.players.findIndex(p => p.sid == this.st.user.sid);
            // Sometimes a player name isn't stored yet (TODO: why?)
            if (
              myGidx >= 0 &&
              !this.game.players[1 - myGidx].name &&
              this.game.players[1 - myGidx].sid == user.sid &&
              !!user.name
            ) {
              this.game.players[1-myGidx].name = user.name;
              GameStorage.update(
                this.gameRef,
                { playerName: { idx: 1 - myGidx, name: user.name } }
              );
            }
          }
          this.$forceUpdate(); //TODO: shouldn't be required
          // If I multi-connect, kill current connexion if no mark (I'm older)
          if (this.newConnect[user.sid]) {
            delete this.newConnect[user.sid];
            if (
              user.id > 0 &&
              user.id == this.st.user.id &&
              user.sid != this.st.user.sid
            ) {
              this.cleanBeforeDestroy();
              alert(this.st.tr["New connexion detected: tab now offline"]);
              break;
            }
          }
          // Ask potentially missed last state, if opponent and I play
          if (
            !this.gotLastate &&
            !!this.game.mycolor &&
            this.game.type == "live" &&
            this.game.score == "*" &&
            this.game.players.some(p => p.sid == user.sid)
          ) {
            this.send("asklastate", { target: user.sid });
            let counter = 1;
            this.askLastate = setInterval(
              () => {
                // Ask at most 3 times:
                // if no reply after that there should be a network issue.
                if (
                  counter < 3 &&
                  !this.gotLastate &&
                  !!this.people[user.sid]
                ) {
                  this.send("asklastate", { target: user.sid });
                  counter++;
                } else {
                  clearInterval(this.askLastate);
                }
              },
              1500
            );
          }
          break;
        }
        case "askgame":
          // Send current (live or import) game,
          // if not asked by any of the players
          if (
            this.game.type != "corr" &&
            this.game.players.every(p => p.sid != data.from[0])
          ) {
            const myGame = {
              id: this.game.id,
              // FEN is current position, unused for now
              fen: this.game.fen,
              players: this.game.players,
              vid: this.game.vid,
              cadence: this.game.cadence,
              score: this.game.score
            };
            this.send("game", { data: myGame, target: data.from });
          }
          break;
        case "askfullgame":
          const gameToSend = Object.keys(this.game)
            .filter(k =>
              [
                "id","fen","players","vid","cadence","fenStart","vname",
                "moves","clocks","score","drawOffer","rematchOffer"
              ].includes(k))
            .reduce(
              (obj, k) => {
                obj[k] = this.game[k];
                return obj;
              },
              {}
            );
          this.send("fullgame", { data: gameToSend, target: data.from });
          break;
        case "fullgame":
          if (!!data.data.empty) {
            alert(this.st.tr["The game should be in another tab"]);
            this.$router.go(-1);
          }
          else
            // Callback "roomInit" to poll clients only after game is loaded
            this.loadVariantThenGame(data.data, this.roomInit);
          break;
        case "asklastate":
          // Sending informative last state if I played a move or score != "*"
          // If the game or moves aren't loaded yet, delay the sending:
          // TODO: socket init after game load, so the game is supposedly ready
          if (!this.game || !this.game.moves) this.lastateAsked = true;
          else this.sendLastate(data.from);
          break;
        case "lastate": {
          // Got opponent infos about last move
          this.gotLastate = true;
          this.lastate = data.data;
          if (this.game.rendered)
            // Game is rendered (Board component)
            this.processLastate();
          // Else: will be processed when game is ready
          break;
        }
        case "newmove": {
          const movePlus = data.data;
          const movesCount = this.game.moves.length;
          if (movePlus.index > movesCount) {
            // This can only happen if I'm an observer and missed a move.
            if (this.gotMoveIdx < movePlus.index)
              this.gotMoveIdx = movePlus.index;
            if (!this.gameIsLoading) this.askGameAgain();
          }
          else {
            if (
              movePlus.index < movesCount ||
              this.gotMoveIdx >= movePlus.index
            ) {
              // Opponent re-send but we already have the move:
              // (maybe he didn't receive our pingback...)
              this.send("gotmove", {data: movePlus.index, target: data.from});
            } else {
              this.gotMoveIdx = movePlus.index;
              const receiveMyMove = (movePlus.color == this.game.mycolor);
              const moveColIdx = ["w", "b"].indexOf(movePlus.color);
              if (!receiveMyMove && !!this.game.mycolor) {
                // Notify opponent that I got the move:
                this.send(
                  "gotmove",
                  { data: movePlus.index, target: data.from }
                );
                // And myself if I'm elsewhere:
                if (!this.focus) {
                  notify(
                    "New move",
                    {
                      body:
                        (this.game.players[moveColIdx].name || "@nonymous") +
                        " just played."
                    }
                  );
                }
              }
              if (movePlus.cancelDrawOffer) {
                // Opponent refuses draw
                this.drawOffer = "";
                // NOTE for corr games: drawOffer reset by player in turn
                if (
                  this.game.type == "live" &&
                  !!this.game.mycolor &&
                  !receiveMyMove
                ) {
                  GameStorage.update(this.gameRef, { drawOffer: "" });
                }
              }
              this.$refs["basegame"].play(
                movePlus.move, "received", null, true);
              this.game.clocks[moveColIdx] = movePlus.clock;
              this.processMove(
                movePlus.move,
                { receiveMyMove: receiveMyMove }
              );
            }
          }
          break;
        }
        case "gotmove": {
          this.opponentGotMove = true;
          // Now his clock starts running on my side:
          const oppIdx = ['w','b'].indexOf(this.vr.turn);
          // NOTE: next line to avoid multi-resetClocks when several tabs
          // on same game, resulting in a faster countdown.
          if (!!this.clockUpdate) clearInterval(this.clockUpdate);
          this.re_setClocks();
          break;
        }
        case "resign":
          const score = (data.data == "b" ? "1-0" : "0-1");
          const side = (data.data == "w" ? "White" : "Black");
          this.gameOver(score, side + " surrender");
          break;
        case "abort":
          this.gameOver("?", "Stop");
          break;
        case "draw":
          this.gameOver("1/2", data.data);
          break;
        case "drawoffer":
          // NOTE: observers don't know who offered draw
          this.drawOffer = "received";
          if (!!this.game.mycolor && this.game.type == "live") {
            GameStorage.update(
              this.gameRef,
              { drawOffer: V.GetOppCol(this.game.mycolor) }
            );
          }
          break;
        case "rematchoffer":
          // NOTE: observers don't know who offered rematch
          this.rematchOffer = data.data ? "received" : "";
          if (!!this.game.mycolor && this.game.type == "live") {
            GameStorage.update(
              this.gameRef,
              { rematchOffer: V.GetOppCol(this.game.mycolor) }
            );
          }
          break;
        case "newgame": {
          // A game started, redirect if I'm playing in
          const gameInfo = data.data;
          const gameType = this.getGameType(gameInfo);
          if (
            gameType == "live" &&
            gameInfo.players.some(p => p.sid == this.st.user.sid)
          ) {
            this.addAndGotoLiveGame(gameInfo);
          } else if (
            gameType == "corr" &&
            gameInfo.players.some(p => p.id == this.st.user.id)
          ) {
            this.$router.push("/game/" + gameInfo.id);
          } else {
            this.rematchId = gameInfo.id;
            document.getElementById("modalInfo").checked = true;
          }
          break;
        }
        case "newchat": {
          let chat = data.data;
          this.$refs["chatcomp"].newChat(chat);
          if (this.game.type == "live") {
            chat.added = Date.now();
            if (!!this.game.mycolor)
              GameStorage.update(this.gameRef, { chat: chat });
          }
          if (!document.getElementById("modalChat").checked)
            document.getElementById("chatBtn").classList.add("somethingnew");
          break;
        }
      }
    },
    updateCorrGame: function(obj, callback) {
      ajax(
        "/games",
        "PUT",
        {
          data: {
            gid: this.gameRef,
            newObj: obj
          },
          success: () => {
            if (!!callback) callback();
          }
        }
      );
    },
    sendLastate: function(target) {
      // Send our "last state" informations to opponent
      const L = this.game.moves.length;
      const myIdx = ["w", "b"].indexOf(this.game.mycolor);
      const myLastate = {
        lastMove:
          (L > 0 && this.vr.turn != this.game.mycolor)
            ? this.game.moves[L - 1]
            : undefined,
        clock: this.game.clocks[myIdx],
        // Since we played a move (or abort or resign),
        // only drawOffer=="sent" is possible
        drawSent: this.drawOffer == "sent",
        rematchSent: this.rematchOffer == "sent",
        score: this.game.score != "*" ? this.game.score : undefined,
        scoreMsg: this.game.score != "*" ? this.game.scoreMsg : undefined,
        movesCount: L
      };
      this.send("lastate", { data: myLastate, target: target });
    },
    // lastate was received, but maybe game wasn't ready yet:
    processLastate: function() {
      const data = this.lastate;
      this.lastate = undefined; //security...
      const L = this.game.moves.length;
      const oppIdx = 1 - ["w", "b"].indexOf(this.game.mycolor);
      this.game.clocks[oppIdx] = data.clock;
      if (data.movesCount > L) {
        // Just got last move from him
        this.$refs["basegame"].play(data.lastMove, "received", null, true);
        this.processMove(data.lastMove);
      } else {
        if (!!this.clockUpdate) clearInterval(this.clockUpdate);
        this.re_setClocks();
      }
      if (data.drawSent) this.drawOffer = "received";
      if (data.rematchSent) this.rematchOffer = "received";
      if (!!data.score) {
        this.drawOffer = "";
        if (this.game.score == "*")
          this.gameOver(data.score, data.scoreMsg);
      }
    },
    clickDraw: function() {
      if (!this.game.mycolor || this.game.type == "import") return;
      if (["received", "threerep"].includes(this.drawOffer)) {
        if (!confirm(this.st.tr["Accept draw?"])) return;
        const message =
          this.drawOffer == "received"
            ? "Mutual agreement"
            : "Three repetitions";
        this.send("draw", { data: message });
        this.gameOver("1/2", message);
      } else if (this.drawOffer == "") {
        // No effect if drawOffer == "sent"
        if (this.game.mycolor != this.vr.turn) {
          alert(this.st.tr["Draw offer only in your turn"]);
          return;
        }
        if (!confirm(this.st.tr["Offer draw?"])) return;
        this.drawOffer = "sent";
        this.send("drawoffer");
        if (this.game.type == "live") {
          GameStorage.update(
            this.gameRef,
            { drawOffer: this.game.mycolor }
          );
        } else this.updateCorrGame({ drawOffer: this.game.mycolor });
      }
    },
    addAndGotoLiveGame: function(gameInfo, callback) {
      const game = Object.assign(
        {},
        gameInfo,
        {
          // (other) Game infos: constant
          fenStart: gameInfo.fen,
          vname: this.game.vname,
          created: Date.now(),
          // Game state (including FEN): will be updated
          moves: [],
          clocks: [-1, -1], //-1 = unstarted
          score: "*"
        }
      );
      GameStorage.add(game, (err) => {
        // No error expected.
        if (!err) {
          if (this.st.settings.sound)
            new Audio("/sounds/newgame.flac").play().catch(() => {});
          if (!!callback) callback();
          this.$router.push("/game/" + gameInfo.id);
        }
      });
    },
    clickRematch: function() {
      if (!this.game.mycolor || this.game.type == "import") return;
      if (this.rematchOffer == "received") {
        // Start a new game!
        let gameInfo = {
          id: getRandString(), //ignored if corr
          fen: V.GenRandInitFen(this.game.randomness),
          players: this.game.players.reverse(),
          vid: this.game.vid,
          cadence: this.game.cadence
        };
        const notifyNewGame = () => {
          const oppsid = this.getOppsid(); //may be null
          this.send("rnewgame", { data: gameInfo, oppsid: oppsid });
          // To main Hall if corr game:
          if (this.game.type == "corr")
            this.send("newgame", { data: gameInfo, page: "/" });
          // Also to MyGames page:
          this.notifyMyGames("newgame", gameInfo);
        };
        if (this.game.type == "live")
          this.addAndGotoLiveGame(gameInfo, notifyNewGame);
        else {
          // corr game
          ajax(
            "/games",
            "POST",
            {
              // cid is useful to delete the challenge:
              data: { gameInfo: gameInfo },
              success: (response) => {
                gameInfo.id = response.gameId;
                notifyNewGame();
                this.$router.push("/game/" + response.gameId);
              }
            }
          );
        }
      } else if (this.rematchOffer == "") {
        this.rematchOffer = "sent";
        this.send("rematchoffer", { data: true });
        if (this.game.type == "live") {
          GameStorage.update(
            this.gameRef,
            { rematchOffer: this.game.mycolor }
          );
        } else this.updateCorrGame({ rematchOffer: this.game.mycolor });
      } else if (this.rematchOffer == "sent") {
        // Toggle rematch offer (on --> off)
        this.rematchOffer = "";
        this.send("rematchoffer", { data: false });
        if (this.game.type == "live") {
          GameStorage.update(
            this.gameRef,
            { rematchOffer: '' }
          );
        } else this.updateCorrGame({ rematchOffer: 'n' });
      }
    },
    abortGame: function() {
      if (!this.game.mycolor || !confirm(this.st.tr["Terminate game?"]))
        return;
      this.gameOver("?", "Stop");
      this.send("abort");
    },
    resign: function() {
      if (!this.game.mycolor || !confirm(this.st.tr["Resign the game?"]))
        return;
      this.send("resign", { data: this.game.mycolor });
      const score = (this.game.mycolor == "w" ? "0-1" : "1-0");
      const side = (this.game.mycolor == "w" ? "White" : "Black");
      this.gameOver(score, side + " surrender");
    },
    loadGame: function(game, callback) {
      const gtype = game.type || this.getGameType(game);
      const tc = extractTime(game.cadence);
      const myIdx = game.players.findIndex(p => {
        return p.sid == this.st.user.sid || p.id == this.st.user.id;
      });
      // Sometimes the name isn't stored yet (TODO: why?)
      if (
        myIdx >= 0 &&
        gtype == "live" &&
        !game.players[myIdx].name &&
        !!this.st.user.name
      ) {
        game.players[myIdx].name = this.st.user.name;
        GameStorage.update(
          game.id,
          { playerName: { idx: myIdx, name: this.st.user.name } }
        );
      }
      // "mycolor" is undefined for observers
      const mycolor = [undefined, "w", "b"][myIdx + 1];
      if (gtype == "corr") {
        if (mycolor == 'w') game.chatRead = game.chatReadWhite;
        else if (mycolor == 'b') game.chatRead = game.chatReadBlack;
        // NOTE: clocks in seconds
        game.moves.sort((m1, m2) => m1.idx - m2.idx); //in case of
        game.clocks = [tc.mainTime, tc.mainTime];
        const L = game.moves.length;
        if (game.score == "*") {
          // Adjust clocks
          if (L >= 2) {
            game.clocks[L % 2] -=
              (Date.now() - game.moves[L-1].played) / 1000;
          }
        }
        // Now that we used idx and played, re-format moves as for live games
        game.moves = game.moves.map(m => m.squares);
      }
      else if (gtype == "live") {
        if (game.clocks[0] < 0) {
          // Game is unstarted. clock is ignored until move 2
          game.clocks = [tc.mainTime, tc.mainTime];
          if (myIdx >= 0) {
            // I play in this live game
            GameStorage.update(
              game.id,
              { clocks: game.clocks }
            );
          }
        } else {
          if (!!game.initime)
            // It's my turn: clocks not updated yet
            game.clocks[myIdx] -= (Date.now() - game.initime) / 1000;
        }
      }
      else
        // gtype == "import"
        game.clocks = [tc.mainTime, tc.mainTime];
      // Live games before 26/03/2020 don't have chat history:
      if (!game.chats) game.chats = []; //TODO: remove line
      // Sort chat messages from newest to oldest
      game.chats.sort((c1, c2) => c2.added - c1.added);
      if (
        myIdx >= 0 &&
        game.chats.length > 0 &&
        (!game.chatRead || game.chatRead < game.chats[0].added)
      ) {
        // A chat message arrived since my last reading:
        document.getElementById("chatBtn").classList.add("somethingnew");
      }
      // TODO: merge next 2 "if" conditions
      if (!!game.drawOffer) {
        if (game.drawOffer == "t")
          // Three repetitions
          this.drawOffer = "threerep";
        else {
          // Draw offered by any of the players:
          if (myIdx < 0) this.drawOffer = "received";
          else {
            // I play in this game:
            if (
              (game.drawOffer == "w" && myIdx == 0) ||
              (game.drawOffer == "b" && myIdx == 1)
            )
              this.drawOffer = "sent";
            else this.drawOffer = "received";
          }
        }
      }
      if (!!game.rematchOffer) {
        if (myIdx < 0) this.rematchOffer = "received";
        else {
          // I play in this game:
          if (
            (game.rematchOffer == "w" && myIdx == 0) ||
            (game.rematchOffer == "b" && myIdx == 1)
          )
            this.rematchOffer = "sent";
          else this.rematchOffer = "received";
        }
      }
      this.repeat = {}; //reset: scan past moves' FEN:
      let repIdx = 0;
      this.vr = new V(game.fenStart);
      let curTurn = "n";
      game.moves.forEach(m => {
        playMove(m, this.vr);
        const fenIdx = this.vr.getFenForRepeat();
        this.repeat[fenIdx] = this.repeat[fenIdx]
          ? this.repeat[fenIdx] + 1
          : 1;
      });
      // Imported games don't have current FEN
      if (!game.fen) game.fen = this.vr.getFen();
      if (this.repeat[repIdx] >= 3) this.drawOffer = "threerep";
      this.game = Object.assign(
        // NOTE: assign mycolor here, since BaseGame could also be VS computer
        {
          type: gtype,
          increment: tc.increment,
          mycolor: mycolor,
          // opponent sid not strictly required (or available), but easier
          // at least oppsid or oppid is available anyway:
          oppsid: myIdx < 0 ? undefined : game.players[1 - myIdx].sid,
          oppid: myIdx < 0 ? undefined : game.players[1 - myIdx].id
        },
        game
      );
      this.$refs["basegame"].re_setVariables(this.game);
      if (!this.gameIsLoading) {
        // Initial loading:
        this.gotMoveIdx = game.moves.length - 1;
        // If we arrive here after 'nextGame' action, the board might be hidden
        let boardDiv = document.querySelector(".game");
        if (!!boardDiv && boardDiv.style.visibility == "hidden")
          boardDiv.style.visibility = "visible";
      }
      this.re_setClocks();
      this.$nextTick(() => {
        this.game.rendered = true;
        // Did lastate arrive before game was rendered?
        if (this.lastate) this.processLastate();
      });
      if (this.lastateAsked) {
        this.lastateAsked = false;
        this.sendLastate(game.oppsid);
      }
      if (this.gameIsLoading) {
        this.gameIsLoading = false;
        if (this.gotMoveIdx >= game.moves.length)
          // Some moves arrived meanwhile...
          this.askGameAgain();
      }
      if (!!callback) callback();
    },
    loadVariantThenGame: async function(game, callback) {
      await import("@/variants/" + game.vname + ".js")
      .then((vModule) => {
        window.V = vModule[game.vname + "Rules"];
        this.loadGame(game, callback);
      });
    },
    // 3 cases for loading a game:
    //  - from indexedDB (running or completed live game I play)
    //  - from server (one correspondance game I play[ed] or not)
    //  - from remote peer (one live game I don't play, finished or not)
    fetchGame: function(callback) {
      if (Number.isInteger(this.gameRef) || !isNaN(parseInt(this.gameRef))) {
        // corr games identifiers are integers
        ajax(
          "/games",
          "GET",
          {
            data: { gid: this.gameRef },
            success: (res) => {
              res.game.moves.forEach(m => {
                m.squares = JSON.parse(m.squares);
              });
              callback(res.game);
            }
          }
        );
      }
      else if (!!this.gameRef.match(/^i/))
        // Game import (maybe remote)
        ImportgameStorage.get(this.gameRef, callback);
      else
        // Local live game (or remote)
        GameStorage.get(this.gameRef, callback);
    },
    re_setClocks: function() {
      this.virtualClocks = this.game.clocks.map(s => ppt(s).split(':'));
      if (this.game.moves.length < 2 || this.game.score != "*") {
        // 1st move not completed yet, or game over: freeze time
        return;
      }
      const currentTurn = this.vr.turn;
      const currentMovesCount = this.game.moves.length;
      const colorIdx = ["w", "b"].indexOf(currentTurn);
      this.clockUpdate = setInterval(
        () => {
          if (
            this.game.clocks[colorIdx] < 0 ||
            this.game.moves.length > currentMovesCount ||
            this.game.score != "*"
          ) {
            clearInterval(this.clockUpdate);
            this.clockUpdate = null;
            if (this.game.clocks[colorIdx] < 0)
              this.gameOver(
                currentTurn == "w" ? "0-1" : "1-0",
                "Time"
              );
          } else {
            this.$set(
              this.virtualClocks,
              colorIdx,
              ppt(Math.max(0, --this.game.clocks[colorIdx])).split(':')
            );
          }
        },
        1000
      );
    },
    // Update variables and storage after a move:
    processMove: function(move, data) {
      if (this.game.type == "import")
        // Shouldn't receive any messages in this mode:
        return;
      if (!data) data = {};
      const moveCol = this.vr.turn;
      const colorIdx = ["w", "b"].indexOf(moveCol);
      const nextIdx = 1 - colorIdx;
      const doProcessMove = () => {
        const origMovescount = this.game.moves.length;
        // The move is (about to be) played: stop clock
        clearInterval(this.clockUpdate);
        this.clockUpdate = null;
        if (moveCol == this.game.mycolor && !data.receiveMyMove) {
          if (this.drawOffer == "received")
            // I refuse draw
            this.drawOffer = "";
          if (this.game.type == "live" && origMovescount >= 2) {
            this.game.clocks[colorIdx] += this.game.increment;
            // For a correct display in casqe of disconnected opponent:
            this.$set(
              this.virtualClocks,
              colorIdx,
              ppt(this.game.clocks[colorIdx]).split(':')
            );
            GameStorage.update(this.gameRef, {
              // It's not my turn anymore:
              initime: null
            });
          }
        }
        // Update current game object:
        playMove(move, this.vr);
        if (!data.score)
          // Received move, score is computed in BaseGame, but maybe not yet.
          // ==> Compute it here, although this is redundant (TODO)
          data.score = this.vr.getCurrentScore();
        if (data.score != "*") this.gameOver(data.score);
        this.game.moves.push(move);
        this.game.fen = this.vr.getFen();
        if (this.game.type == "corr") {
          // In corr games, just reset clock to mainTime:
          this.game.clocks[colorIdx] = extractTime(this.game.cadence).mainTime;
        }
        // If repetition detected, consider that a draw offer was received:
        const fenObj = this.vr.getFenForRepeat();
        this.repeat[fenObj] =
          !!this.repeat[fenObj]
            ? this.repeat[fenObj] + 1
            : 1;
        if (this.repeat[fenObj] >= 3) this.drawOffer = "threerep";
        else if (this.drawOffer == "threerep") this.drawOffer = "";
        if (!!this.game.mycolor && !data.receiveMyMove) {
          // NOTE: 'var' to see that variable outside this block
          var filtered_move = getFilteredMove(move);
        }
        if (moveCol == this.game.mycolor && !data.receiveMyMove) {
          // Notify turn on MyGames page:
          this.notifyMyGames(
            "turn",
            {
              gid: this.gameRef,
              turn: this.vr.turn
            }
          );
        }
        // Since corr games are stored at only one location, update should be
        // done only by one player for each move:
        if (
          this.game.type == "live" &&
          !!this.game.mycolor &&
          moveCol != this.game.mycolor &&
          this.game.moves.length >= 2
        ) {
          // Receive a move: update initime
          this.game.initime = Date.now();
          GameStorage.update(this.gameRef, {
            // It's my turn now!
            initime: this.game.initime
          });
        }
        if (
          !!this.game.mycolor &&
          !data.receiveMyMove &&
          (this.game.type == "live" || moveCol == this.game.mycolor)
        ) {
          let drawCode = "";
          switch (this.drawOffer) {
            case "threerep":
              drawCode = "t";
              break;
            case "sent":
              drawCode = this.game.mycolor;
              break;
            case "received":
              drawCode = V.GetOppCol(this.game.mycolor);
              break;
          }
          if (this.game.type == "corr") {
            // corr: only move, fen and score
            this.updateCorrGame({
              fen: this.game.fen,
              move: {
                squares: filtered_move,
                idx: origMovescount
              },
              // Code "n" for "None" to force reset (otherwise it's ignored)
              drawOffer: drawCode || "n"
            });
          }
          else {
            const updateStorage = () => {
              GameStorage.update(this.gameRef, {
                fen: this.game.fen,
                move: filtered_move,
                moveIdx: origMovescount,
                clocks: this.game.clocks,
                drawOffer: drawCode
              });
            };
            // The active tab can update storage immediately
            if (this.focus) updateStorage();
            // Small random delay otherwise
            else setTimeout(updateStorage, 500 + 1000 * Math.random());
          }
        }
        // Send move ("newmove" event) to people in the room (if our turn)
        if (moveCol == this.game.mycolor && !data.receiveMyMove) {
          let sendMove = {
            move: filtered_move,
            index: origMovescount,
            // color is required to check if this is my move
            // (if several tabs opened)
            color: moveCol,
            cancelDrawOffer: this.drawOffer == ""
          };
          if (this.game.type == "live")
            sendMove["clock"] = this.game.clocks[colorIdx];
          // (Live) Clocks will re-start when the opponent pingback arrive
          this.opponentGotMove = false;
          this.send("newmove", {data: sendMove});
          // If the opponent doesn't reply gotmove soon enough, re-send move:
          // Do this at most 2 times, because mpore would mean network issues,
          // opponent would then be expected to disconnect/reconnect.
          let counter = 1;
          const currentUrl = document.location.href;
          this.retrySendmove = setInterval(
            () => {
              if (
                counter >= 3 ||
                this.opponentGotMove ||
                document.location.href != currentUrl //page change
              ) {
                clearInterval(this.retrySendmove);
                return;
              }
              const oppsid = this.getOppsid();
              if (!oppsid)
                // Opponent is disconnected: he'll ask last state
                clearInterval(this.retrySendmove);
              else {
                this.send("newmove", { data: sendMove, target: oppsid });
                counter++;
              }
            },
            1500
          );
        }
        else
          // Not my move or I'm an observer: just start other player's clock
          this.re_setClocks();
      };
      if (
        this.game.type == "corr" &&
        moveCol == this.game.mycolor &&
        !data.receiveMyMove
      ) {
        let boardDiv = document.querySelector(".game");
        const afterSetScore = () => {
          doProcessMove();
          if (this.st.settings.gotonext && this.nextIds.length > 0)
            this.showNextGame();
          else {
            // The board might have been hidden:
            if (boardDiv.style.visibility == "hidden")
              boardDiv.style.visibility = "visible";
            if (data.score == "*") this.re_setClocks();
          }
        };
        let el = document.querySelector("#buttonsConfirm > .acceptBtn");
        // We may play several moves in a row: in case of, remove listener:
        let elClone = el.cloneNode(true);
        el.parentNode.replaceChild(elClone, el);
        elClone.addEventListener(
          "click",
          () => {
            document.getElementById("modalConfirm").checked = false;
            if (!!data.score && data.score != "*")
              // Set score first
              this.gameOver(data.score, null, afterSetScore);
            else afterSetScore();
          }
        );
        // PlayOnBoard is enough, and more appropriate for Synchrone Chess
        const arMove = (Array.isArray(move) ? move : [move]);
        for (let i = 0; i < arMove.length; i++)
          V.PlayOnBoard(this.vr.board, arMove[i]);
        const position = this.vr.getBaseFen();
        for (let i = arMove.length - 1; i >= 0; i--)
          V.UndoOnBoard(this.vr.board, arMove[i]);
        if (["all","byrow"].includes(V.ShowMoves)) {
          this.curDiag = getDiagram({
            position: position,
            orientation: V.CanFlip ? this.game.mycolor : "w"
          });
          document.querySelector("#confirmDiv > .card").style.width =
            boardDiv.offsetWidth + "px";
        } else {
          // Incomplete information: just ask confirmation
          // Hide the board, because otherwise it could reveal infos
          boardDiv.style.visibility = "hidden";
          this.moveNotation = getFullNotation(move);
        }
        document.getElementById("modalConfirm").checked = true;
      }
      else {
        // Normal situation
        if (!!data.score && data.score != "*")
          this.gameOver(data.score, null, doProcessMove);
        else doProcessMove();
      }
    },
    cancelMove: function() {
      let boardDiv = document.querySelector(".game");
      if (boardDiv.style.visibility == "hidden")
        boardDiv.style.visibility = "visible";
      document.getElementById("modalConfirm").checked = false;
      this.$refs["basegame"].cancelLastMove();
    },
    // In corr games, callback to change page only after score is set:
    gameOver: function(score, scoreMsg, callback) {
      this.game.score = score;
      if (!scoreMsg) scoreMsg = getScoreMessage(score);
      this.game.scoreMsg = scoreMsg;
      this.$set(this.game, "scoreMsg", scoreMsg);
      const myIdx = this.game.players.findIndex(p => {
        return p.sid == this.st.user.sid || p.id == this.st.user.id;
      });
      if (myIdx >= 0) {
        // OK, I play in this game
        const scoreObj = {
          score: score,
          scoreMsg: scoreMsg
        };
        if (this.game.type == "live") {
          GameStorage.update(this.gameRef, scoreObj);
          // Notify myself locally if I'm elsewhere:
          if (!this.focus) {
            notify(
              "Game over",
              { body: score + " : " + scoreMsg }
            );
          }
          if (!!callback) callback();
        }
        else this.updateCorrGame(scoreObj, callback);
        // Notify the score to main Hall.
        // TODO: only one player (currently double send)
        this.send("result", { gid: this.game.id, score: score });
        // Also to MyGames page (TODO: doubled as well...)
        this.notifyMyGames(
          "score",
          {
            gid: this.gameRef,
            score: score
          }
        );
      }
      else if (!!callback) callback();
    }
  }
};
</script>

<style lang="sass" scoped>
#infoDiv > .card
  padding: 15px 0
  max-width: 430px

.connected
  background-color: lightgreen

#participants
  margin-left: 5px

.anonymous
  color: grey
  font-style: italic

#playersInfo > p
  margin: 0

@media screen and (min-width: 768px)
  #actions
    width: 300px
@media screen and (max-width: 767px)
  .game
    width: 100%

#actions
  display: inline-block
  margin: 0

button
  display: inline-block
  margin: 0
  display: inline-flex
  img
    height: 22px
    display: flex
    @media screen and (max-width: 767px)
      height: 18px

@media screen and (max-width: 767px)
  #aboveBoard
    text-align: center
@media screen and (min-width: 768px)
  #aboveBoard
    margin-left: 30%

.variant-cadence
  padding-right: 10px

.variant-name
  font-weight: bold
  padding-right: 10px

span#nextGame
  background-color: #edda99
  cursor: pointer
  display: inline-block
  margin-right: 10px

span.name
  font-size: 1.5rem
  padding: 0 3px

span.time
  font-size: 2rem
  display: inline-block
  .time-left
    margin-left: 10px
  .time-right
    margin-left: 5px
  .time-separator
    margin-left: 5px
    position: relative
    top: -1px

span.yourturn
  color: #831B1B
  .time-separator
    animation: blink-animation 2s steps(3, start) infinite
@keyframes blink-animation
  to
    visibility: hidden

.split-names
  display: inline-block
  margin: 0 15px

#chatWrap > .card
  padding-top: 20px
  max-width: 767px
  border: none

#confirmDiv > .card
  max-width: 767px
  max-height: 100%

.draw-sent, .draw-sent:hover
  background-color: lightyellow

.draw-received, .draw-received:hover
  background-color: lightgreen

.draw-threerep, .draw-threerep:hover
  background-color: #e4d1fc

.rematch-sent, .rematch-sent:hover
  background-color: lightyellow

.rematch-received, .rematch-received:hover
  background-color: lightgreen

.somethingnew
  background-color: #c5fefe

.diagram
  margin: 0 auto
  width: 100%

#buttonsConfirm
  margin: 0
  & > button > span
    width: 100%
    text-align: center

button.acceptBtn
  background-color: lightgreen
button.refuseBtn
  background-color: red
</style>
