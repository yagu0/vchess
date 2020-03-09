<template lang="pug">
main
  input#modalInfo.modal(type="checkbox")
  div#infoDiv(
    role="dialog"
    data-checkbox="modalInfo"
  )
    .card.text-center
      label.modal-close(for="modalInfo")
      p(v-html="infoMessage")
  input#modalChat.modal(
    type="checkbox"
    @click="resetChatColor()"
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
          v-if="p.focus && !!p.name"
        )
          | {{ p.name }} 
        span.anonymous(
          v-if="Object.values(people).some(p => p.focus && !p.name)"
        )
          | + @nonymous
      Chat(
        ref="chatcomp"
        :players="game.players"
        :pastChats="game.chats"
        :newChat="newChat"
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
      span.variant-cadence {{ game.cadence }}
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
        v-else-if="!!game.mycolor"
        @click="clickRematch()"
        :class="{['rematch-' + rematchOffer]: true}"
        :aria-label="st.tr['Rematch']"
      )
        img(src="/images/icons/rematch.svg")
      #playersInfo
        p
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
import { ppt } from "@/utils/datetime";
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
      gameRef: {
        // rid = remote (socket) ID
        id: "",
        rid: ""
      },
      nextIds: [],
      game: {}, //passed to BaseGame
      // virtualClocks will be initialized from true game.clocks
      virtualClocks: [],
      vr: null, //"variant rules" object initialized from FEN
      drawOffer: "",
      rematchOffer: "",
      people: {}, //players + observers
      onMygames: [], //opponents (or me) on "MyGames" page
      lastate: undefined, //used if opponent send lastate before game is ready
      repeat: {}, //detect position repetition
      curDiag: "", //for corr moves confirmation
      newChat: "",
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
      // Incomplete info games: show move played
      moveNotation: "",
      // Intervals from setInterval():
      askLastate: null,
      retrySendmove: null,
      clockUpdate: null,
      // Related to (killing of) self multi-connects:
      newConnect: {},
      killed: {}
    };
  },
  watch: {
    $route: function(to, from) {
      if (from.params["id"] != to.params["id"]) {
        // Change everything:
        this.cleanBeforeDestroy();
        let boardDiv = document.querySelector(".game");
        if (!!boardDiv)
          // In case of incomplete information variant:
          boardDiv.style.visibility = "hidden";
        this.atCreation();
      } else {
        // Same game ID
        this.gameRef.id = to.params["id"];
        this.gameRef.rid = to.query["rid"];
        this.nextIds = JSON.parse(this.$route.query["next"] || "[]");
        this.loadGame();
      }
    }
  },
  // NOTE: some redundant code with Hall.vue (mostly related to people array)
  created: function() {
    this.atCreation();
  },
  mounted: function() {
    document.addEventListener('visibilitychange', this.visibilityChange);
    document
      .getElementById("chatWrap")
      .addEventListener("click", processModalClick);
    if ("ontouchstart" in window) {
      // Disable tooltips on smartphones:
      document.getElementsByClassName("tooltip").forEach(elt => {
        elt.classList.remove("tooltip");
      });
    }
  },
  beforeDestroy: function() {
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.cleanBeforeDestroy();
  },
  methods: {
    visibilityChange: function() {
      // TODO: Use document.hidden? https://webplatform.news/issues/2019-03-27
      this.send(
        document.visibilityState == "visible"
          ? "getfocus"
          : "losefocus"
      );
    },
    atCreation: function() {
      // 0] (Re)Set variables
      this.gameRef.id = this.$route.params["id"];
      // rid = remote ID to find an observed live game,
      // next = next corr games IDs to navigate faster
      // (Both might be undefined)
      this.gameRef.rid = this.$route.query["rid"];
      this.nextIds = JSON.parse(this.$route.query["next"] || "[]");
      // Always add myself to players' list
      const my = this.st.user;
      this.$set(
        this.people,
        my.sid,
        {
          id: my.id,
          name: my.name,
          focus: true
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
      this.rematchOffer = "";
      this.onMygames = [];
      this.lastate = undefined;
      this.newChat = "";
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
      this.killed = {};
      // 1] Initialize connection
      this.connexionString =
        params.socketUrl +
        "/?sid=" +
        this.st.user.sid +
        "&tmpId=" +
        getRandString() +
        "&page=" +
        // Discard potential "/?next=[...]" for page indication:
        encodeURIComponent(this.$route.path.match(/\/game\/[a-zA-Z0-9]+/)[0]);
      this.conn = new WebSocket(this.connexionString);
      this.conn.onmessage = this.socketMessageListener;
      this.conn.onclose = this.socketCloseListener;
      // Socket init required before loading remote game:
      const socketInit = callback => {
        if (!!this.conn && this.conn.readyState == 1)
          // 1 == OPEN state
          callback();
        else
          // Socket not ready yet (initial loading)
          // NOTE: it's important to call callback without arguments,
          // otherwise first arg is Websocket object and loadGame fails.
          this.conn.onopen = () => callback();
      };
      if (!this.gameRef.rid)
        // Game stored locally or on server
        this.loadGame(null, () => socketInit(this.roomInit));
      else
        // Game stored remotely: need socket to retrieve it
        // NOTE: the callback "roomInit" will be lost, so we don't provide it.
        // --> It will be given when receiving "fullgame" socket event.
        socketInit(this.loadGame);
    },
    cleanBeforeDestroy: function() {
      if (!!this.askLastate)
        clearInterval(this.askLastate);
      if (!!this.retrySendmove)
        clearInterval(this.retrySendmove);
      if (!!this.clockUpdate)
        clearInterval(this.clockUpdate);
      this.send("disconnect");
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
      if (!!this.conn)
        this.conn.send(JSON.stringify(Object.assign({ code: code }, obj)));
    },
    isConnected: function(index) {
      const player = this.game.players[index];
      // Is it me ? In this case no need to bother with focus
      if (this.st.user.sid == player.sid || this.st.user.id == player.uid)
        // Still have to check for name (because of potential multi-accounts
        // on same browser, although this should be rare...)
        return (!this.st.user.name || this.st.user.name == player.name);
      // Try to find a match in people:
      return (
        (
          !!player.sid &&
          Object.keys(this.people).some(sid =>
            sid == player.sid && this.people[sid].focus)
        )
        ||
        (
          player.uid &&
          Object.values(this.people).some(p =>
            p.id == player.uid && p.focus)
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
    resetChatColor: function() {
      // TODO: this is called twice, once on opening an once on closing
      document.getElementById("chatBtn").classList.remove("somethingnew");
    },
    processChat: function(chat) {
      this.send("newchat", { data: chat });
      // NOTE: anonymous chats in corr games are not stored on server (TODO?)
      if (this.game.type == "corr" && this.st.user.id > 0)
        this.updateCorrGame({ chat: chat });
    },
    clearChat: function() {
      // Nothing more to do if game is live (chats not recorded)
      if (this.game.type == "corr") {
        if (!!this.game.mycolor) {
          ajax(
            "/chats",
            "DELETE",
            { data: { gid: this.game.id } }
          );
        }
        this.$set(this.game, "chats", []);
      }
    },
    // Notify turn after a new move (to opponent and me on MyGames page)
    notifyTurn: function(sid) {
      const player = this.people[sid];
      const colorIdx = this.game.players.findIndex(
        p => p.sid == sid || p.uid == player.id);
      const color = ["w","b"][colorIdx];
      const movesCount = this.game.moves.length;
      const yourTurn =
        (color == "w" && movesCount % 2 == 0) ||
        (color == "b" && movesCount % 2 == 1);
      this.send("turnchange", { target: sid, yourTurn: yourTurn });
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
        if (!this.gameRef.rid)
          // This is my game: just reload.
          this.loadGame();
        else
          // Just ask fullgame again (once!), this is much simpler.
          // If this fails, the user could just reload page :/
          this.send("askfullgame", { target: this.gameRef.rid });
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
          data.sockIds.forEach(sid => {
            if (sid != this.st.user.sid) {
              this.people[sid] = { focus: true };
              this.send("askidentity", { target: sid });
            }
          });
          break;
        case "connect":
          if (!this.people[data.from]) {
            this.people[data.from] = { focus: true };
            this.newConnect[data.from] = true; //for self multi-connects tests
            this.send("askidentity", { target: data.from });
          }
          break;
        case "disconnect":
          this.$delete(this.people, data.from);
          break;
        case "mconnect": {
          // TODO: from MyGames page : send mconnect message with the list of gid (live and corr)
          // Either me (another tab) or opponent
          const sid = data.from;
          if (!this.onMygames.some(s => s == sid))
          {
            this.onMygames.push(sid);
            this.notifyTurn(sid); //TODO: this may require server ID (so, notify after receiving identity)
          }
          break;
          if (!this.people[sid])
            this.send("askidentity", { target: sid });
        }
        case "mdisconnect":
          ArrayFun.remove(this.onMygames, sid => sid == data.from);
          break;
        case "getfocus": {
          let player = this.people[data.from];
          if (!!player) {
            player.focus = true;
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        }
        case "losefocus": {
          let player = this.people[data.from];
          if (!!player) {
            player.focus = false;
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        }
        case "killed":
          // I logged in elsewhere:
          this.conn = null;
          alert(this.st.tr["New connexion detected: tab now offline"]);
          break;
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
          // player.focus is already set
          player.name = user.name;
          player.id = user.id;
          this.$forceUpdate(); //TODO: shouldn't be required
          // If I multi-connect, kill current connexion if no mark (I'm older)
          if (this.newConnect[user.sid]) {
            if (
              user.id > 0 &&
              user.id == this.st.user.id &&
              user.sid != this.st.user.sid &&
              !this.killed[this.st.user.sid]
            ) {
                this.send("killme", { sid: this.st.user.sid });
                this.killed[this.st.user.sid] = true;
            }
            delete this.newConnect[user.sid];
          }
          if (!this.killed[this.st.user.sid]) {
            // Ask potentially missed last state, if opponent and I play
            if (
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
          }
          break;
        }
        case "askgame":
          // Send current (live) game if not asked by any of the players
          if (
            this.game.type == "live" &&
            this.game.players.every(p => p.sid != data.from[0])
          ) {
            const myGame = {
              id: this.game.id,
              fen: this.game.fen,
              players: this.game.players,
              vid: this.game.vid,
              cadence: this.game.cadence,
              score: this.game.score,
              rid: this.st.user.sid //useful in Hall if I'm an observer
            };
            this.send("game", { data: myGame, target: data.from });
          }
          break;
        case "askfullgame":
          const gameToSend = Object.keys(this.game)
            .filter(k =>
              [
                "id","fen","players","vid","cadence","fenStart","vname",
                "moves","clocks","initime","score","drawOffer","rematchOffer"
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
          // Callback "roomInit" to poll clients only after game is loaded
          this.loadGame(data.data, this.roomInit);
          break;
        case "asklastate":
          // Sending informative last state if I played a move or score != "*"
          if (
            (this.game.moves.length > 0 && this.vr.turn != this.game.mycolor) ||
            this.game.score != "*" ||
            this.drawOffer == "sent" ||
            this.rematchOffer == "sent"
          ) {
            // Send our "last state" informations to opponent
            const L = this.game.moves.length;
            const myIdx = ["w", "b"].indexOf(this.game.mycolor);
            const myLastate = {
              lastMove: L > 0 ? this.game.moves[L - 1] : undefined,
              clock: this.game.clocks[myIdx],
              // Since we played a move (or abort or resign),
              // only drawOffer=="sent" is possible
              drawSent: this.drawOffer == "sent",
              rematchSent: this.rematchOffer == "sent",
              score: this.game.score,
              score: this.game.scoreMsg,
              movesCount: L,
              initime: this.game.initime[1 - myIdx] //relevant only if I played
            };
            this.send("lastate", { data: myLastate, target: data.from });
          } else {
            this.send("lastate", { data: {nothing: true}, target: data.from });
          }
          break;
        case "lastate": {
          // Got opponent infos about last move
          this.gotLastate = true;
          if (!data.data.nothing) {
            this.lastate = data.data;
            if (this.game.rendered)
              // Game is rendered (Board component)
              this.processLastate();
            // Else: will be processed when game is ready
          }
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
              if (!receiveMyMove && !!this.game.mycolor)
                // Notify opponent that I got the move:
                this.send("gotmove", {data: movePlus.index, target: data.from});
              if (movePlus.cancelDrawOffer) {
                // Opponent refuses draw
                this.drawOffer = "";
                // NOTE for corr games: drawOffer reset by player in turn
                if (
                  this.game.type == "live" &&
                  !!this.game.mycolor &&
                  !receiveMyMove
                ) {
                  GameStorage.update(this.gameRef.id, { drawOffer: "" });
                }
              }
              this.$refs["basegame"].play(movePlus.move, "received", null, true);
              this.processMove(
                movePlus.move,
                {
                  clock: movePlus.clock,
                  receiveMyMove: receiveMyMove
                }
              );
            }
          }
          break;
        }
        case "gotmove": {
          this.opponentGotMove = true;
          // Now his clock starts running:
          const oppIdx = ['w','b'].indexOf(this.vr.turn);
          this.game.initime[oppIdx] = Date.now();
          this.re_setClocks();
          break;
        }
        case "resign":
          const score = data.side == "b" ? "1-0" : "0-1";
          const side = data.side == "w" ? "White" : "Black";
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
          break;
        case "rematchoffer":
          // NOTE: observers don't know who offered rematch
          this.rematchOffer = data.data ? "received" : "";
          break;
        case "newgame": {
          // A game started, redirect if I'm playing in
          const gameInfo = data.data;
          if (
            gameInfo.players.some(p =>
              p.sid == this.st.user.sid || p.uid == this.st.user.id)
          ) {
            this.$router.push("/game/" + gameInfo.id);
          } else {
            let urlRid = "";
            if (gameInfo.cadence.indexOf('d') === -1) {
              urlRid = "/?rid=";
              // Select sid of any of the online players:
              let onlineSid = [];
              gameInfo.players.forEach(p => {
                if (!!this.people[p.sid]) onlineSid.push(p.sid);
              });
              urlRid += onlineSid[Math.floor(Math.random() * onlineSid.length)];
            }
            this.infoMessage =
              this.st.tr["Rematch in progress:"] +
              " <a href='#/game/" +
              gameInfo.id + urlRid +
              "'>" +
              "#/game/" +
              gameInfo.id + urlRid +
              "</a>";
            document.getElementById("modalInfo").checked = true;
          }
          break;
        }
        case "newchat":
          this.newChat = data.data;
          if (!document.getElementById("modalChat").checked)
            document.getElementById("chatBtn").classList.add("somethingnew");
          break;
      }
    },
    socketCloseListener: function() {
      this.conn = new WebSocket(this.connexionString);
      this.conn.addEventListener("message", this.socketMessageListener);
      this.conn.addEventListener("close", this.socketCloseListener);
    },
    updateCorrGame: function(obj, callback) {
      ajax(
        "/games",
        "PUT",
        {
          data: {
            gid: this.gameRef.id,
            newObj: obj
          },
          success: () => {
            if (!!callback) callback();
          }
        }
      );
    },
    // lastate was received, but maybe game wasn't ready yet:
    processLastate: function() {
      const data = this.lastate;
      this.lastate = undefined; //security...
      const L = this.game.moves.length;
      if (data.movesCount > L) {
        // Just got last move from him
        this.$refs["basegame"].play(data.lastMove, "received", null, true);
        this.processMove(data.lastMove, { clock: data.clock });
      }
      if (data.drawSent) this.drawOffer = "received";
      if (data.rematchSent) this.rematchOffer = "received";
      if (data.score != "*") {
        this.drawOffer = "";
        if (this.game.score == "*")
          this.gameOver(data.score, data.scoreMsg);
      }
    },
    clickDraw: function() {
      if (!this.game.mycolor) return; //I'm just spectator
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
            this.gameRef.id,
            { drawOffer: this.game.mycolor }
          );
        } else this.updateCorrGame({ drawOffer: this.game.mycolor });
      }
    },
    clickRematch: function() {
      if (!this.game.mycolor) return; //I'm just spectator
      if (this.rematchOffer == "received") {
        // Start a new game!
        let gameInfo = {
          id: getRandString(), //ignored if corr
          fen: V.GenRandInitFen(this.game.randomness),
          players: this.game.players.reverse(),
          vid: this.game.vid,
          cadence: this.game.cadence
        };
        let oppsid = this.getOppsid(); //may be null
        this.send("rnewgame", { data: gameInfo, oppsid: oppsid });
        if (this.game.type == "live") {
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
              initime: [0, 0], //initialized later
              score: "*"
            }
          );
          GameStorage.add(game, (err) => {
            // No error expected.
            if (!err) {
              if (this.st.settings.sound)
                new Audio("/sounds/newgame.flac").play().catch(() => {});
              this.$router.push("/game/" + gameInfo.id);
            }
          });
        }
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
            this.gameRef.id,
            { rematchOffer: this.game.mycolor }
          );
        } else this.updateCorrGame({ rematchOffer: this.game.mycolor });
      } else if (this.rematchOffer == "sent") {
        // Toggle rematch offer (on --> off)
        this.rematchOffer = "";
        this.send("rematchoffer", { data: false });
        if (this.game.type == "live") {
          GameStorage.update(
            this.gameRef.id,
            { rematchOffer: '' }
          );
        } else this.updateCorrGame({ rematchOffer: 'n' });
      }
    },
    abortGame: function() {
      if (!this.game.mycolor || !confirm(this.st.tr["Terminate game?"])) return;
      this.gameOver("?", "Stop");
      this.send("abort");
    },
    resign: function() {
      if (!this.game.mycolor || !confirm(this.st.tr["Resign the game?"]))
        return;
      this.send("resign", { data: this.game.mycolor });
      const score = this.game.mycolor == "w" ? "0-1" : "1-0";
      const side = this.game.mycolor == "w" ? "White" : "Black";
      this.gameOver(score, side + " surrender");
    },
    // 3 cases for loading a game:
    //  - from indexedDB (running or completed live game I play)
    //  - from server (one correspondance game I play[ed] or not)
    //  - from remote peer (one live game I don't play, finished or not)
    loadGame: function(game, callback) {
      const afterRetrieval = async game => {
        const vModule = await import("@/variants/" + game.vname + ".js");
        window.V = vModule.VariantRules;
        this.vr = new V(game.fen);
        const gtype = game.cadence.indexOf("d") >= 0 ? "corr" : "live";
        const tc = extractTime(game.cadence);
        const myIdx = game.players.findIndex(p => {
          return p.sid == this.st.user.sid || p.uid == this.st.user.id;
        });
        const mycolor = [undefined, "w", "b"][myIdx + 1]; //undefined for observers
        if (!game.chats) game.chats = []; //live games don't have chat history
        if (gtype == "corr") {
          if (game.players[0].color == "b") {
            // Adopt the same convention for live and corr games: [0] = white
            [game.players[0], game.players[1]] = [
              game.players[1],
              game.players[0]
            ];
          }
          // NOTE: clocks in seconds, initime in milliseconds
          game.moves.sort((m1, m2) => m1.idx - m2.idx); //in case of
          game.clocks = [tc.mainTime, tc.mainTime];
          const L = game.moves.length;
          if (game.score == "*") {
            // Set clocks + initime
            game.initime = [0, 0];
            if (L >= 1) {
              const gameLastupdate = game.moves[L-1].played;
              game.initime[L % 2] = gameLastupdate;
              if (L >= 2) {
                game.clocks[L % 2] =
                  tc.mainTime - (Date.now() - gameLastupdate) / 1000;
              }
            }
          }
          // Sort chat messages from newest to oldest
          game.chats.sort((c1, c2) => {
            return c2.added - c1.added;
          });
          if (myIdx >= 0 && game.score == "*" && game.chats.length > 0) {
            // Did a chat message arrive after my last move?
            let dtLastMove = 0;
            if (L == 1 && myIdx == 0)
              dtLastMove = game.moves[0].played;
            else if (L >= 2) {
              if (L % 2 == 0) {
                // It's now white turn
                dtLastMove = game.moves[L-1-(1-myIdx)].played;
              } else {
                // Black turn:
                dtLastMove = game.moves[L-1-myIdx].played;
              }
            }
            if (dtLastMove < game.chats[0].added)
              document.getElementById("chatBtn").classList.add("somethingnew");
          }
          // Now that we used idx and played, re-format moves as for live games
          game.moves = game.moves.map(m => m.squares);
        }
        if (gtype == "live" && game.clocks[0] < 0) {
          // Game is unstarted
          game.clocks = [tc.mainTime, tc.mainTime];
          if (game.score == "*") {
            game.initime[0] = Date.now();
            if (myIdx >= 0) {
              // I play in this live game; corr games don't have clocks+initime
              GameStorage.update(game.id, {
                clocks: game.clocks,
                initime: game.initime
              });
            }
          }
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
        let vr_tmp = new V(game.fenStart);
        let curTurn = "n";
        game.moves.forEach(m => {
          playMove(m, vr_tmp);
          const fenIdx = vr_tmp.getFen().replace(/ /g, "_");
          this.repeat[fenIdx] = this.repeat[fenIdx]
            ? this.repeat[fenIdx] + 1
            : 1;
        });
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
            oppid: myIdx < 0 ? undefined : game.players[1 - myIdx].uid
          },
          game,
        );
        if (this.gameIsLoading)
          // Re-load game because we missed some moves:
          // artificially reset BaseGame (required if moves arrived in wrong order)
          this.$refs["basegame"].re_setVariables();
        else {
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
        if (this.gameIsLoading) {
          this.gameIsLoading = false;
          if (this.gotMoveIdx >= game.moves.length)
            // Some moves arrived meanwhile...
            this.askGameAgain();
        }
        if (!!callback) callback();
      };
      if (!!game) {
        afterRetrieval(game);
        return;
      }
      if (this.gameRef.rid) {
        // Remote live game: forgetting about callback func... (TODO: design)
        this.send("askfullgame", { target: this.gameRef.rid });
      } else {
        // Local or corr game on server.
        // NOTE: afterRetrieval() is never called if game not found
        const gid = this.gameRef.id;
        if (Number.isInteger(gid) || !isNaN(parseInt(gid))) {
          // corr games identifiers are integers
          ajax(
            "/games",
            "GET",
            {
              data: { gid: gid },
              success: (res) => {
                let g = res.game;
                g.moves.forEach(m => {
                  m.squares = JSON.parse(m.squares);
                });
                afterRetrieval(g);
              }
            }
          );
        }
        else
          // Local game
          GameStorage.get(this.gameRef.id, afterRetrieval);
      }
    },
    re_setClocks: function() {
      if (this.game.moves.length < 2 || this.game.score != "*") {
        // 1st move not completed yet, or game over: freeze time
        this.virtualClocks = this.game.clocks.map(s => ppt(s).split(':'));
        return;
      }
      const currentTurn = this.vr.turn;
      const currentMovesCount = this.game.moves.length;
      const colorIdx = ["w", "b"].indexOf(currentTurn);
      let countdown =
        this.game.clocks[colorIdx] -
        (Date.now() - this.game.initime[colorIdx]) / 1000;
      this.virtualClocks = [0, 1].map(i => {
        const removeTime =
          i == colorIdx ? (Date.now() - this.game.initime[colorIdx]) / 1000 : 0;
        return ppt(this.game.clocks[i] - removeTime).split(':');
      });
      this.clockUpdate = setInterval(
        () => {
          if (
            countdown < 0 ||
            this.game.moves.length > currentMovesCount ||
            this.game.score != "*"
          ) {
            clearInterval(this.clockUpdate);
            if (countdown < 0)
              this.gameOver(
                currentTurn == "w" ? "0-1" : "1-0",
                "Time"
              );
          } else
            this.$set(
              this.virtualClocks,
              colorIdx,
              ppt(Math.max(0, --countdown)).split(':')
            );
        },
        1000
      );
    },
    // Update variables and storage after a move:
    processMove: function(move, data) {
      if (!data) data = {};
      const moveCol = this.vr.turn;
      const doProcessMove = () => {
        const colorIdx = ["w", "b"].indexOf(moveCol);
        const nextIdx = 1 - colorIdx;
        const origMovescount = this.game.moves.length;
        let addTime = 0; //for live games
        if (moveCol == this.game.mycolor && !data.receiveMyMove) {
          if (this.drawOffer == "received")
            // I refuse draw
            this.drawOffer = "";
          if (this.game.type == "live" && origMovescount >= 2) {
            const elapsed = Date.now() - this.game.initime[colorIdx];
            // elapsed time is measured in milliseconds
            addTime = this.game.increment - elapsed / 1000;
          }
        }
        // Update current game object:
        playMove(move, this.vr);
        // The move is played: stop clock
        clearInterval(this.clockUpdate);
        if (!data.score) {
          // Received move, score has not been computed in BaseGame (!!noemit)
          const score = this.vr.getCurrentScore();
          if (score != "*") this.gameOver(score);
        }
// TODO: notifyTurn: "changeturn" message
        this.game.moves.push(move);
        this.game.fen = this.vr.getFen();
        if (this.game.type == "live") {
          if (!!data.clock) this.game.clocks[colorIdx] = data.clock;
          else this.game.clocks[colorIdx] += addTime;
        }
        // In corr games, just reset clock to mainTime:
        else {
          this.game.clocks[colorIdx] = extractTime(this.game.cadence).mainTime;
        }
        // NOTE: opponent's initime is reset after "gotmove" is received
        if (
          !this.game.mycolor ||
          moveCol != this.game.mycolor ||
          !!data.receiveMyMove
        ) {
          this.game.initime[nextIdx] = Date.now();
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
        // Since corr games are stored at only one location, update should be
        // done only by one player for each move:
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
                played: Date.now(),
                idx: origMovescount
              },
              // Code "n" for "None" to force reset (otherwise it's ignored)
              drawOffer: drawCode || "n"
            });
          }
          else {
            const updateStorage = () => {
              GameStorage.update(this.gameRef.id, {
                fen: this.game.fen,
                move: filtered_move,
                moveIdx: origMovescount,
                clocks: this.game.clocks,
                initime: this.game.initime,
                drawOffer: drawCode
              });
            };
            // The active tab can update storage immediately
            if (!document.hidden) updateStorage();
            // Small random delay otherwise
            else setTimeout(updateStorage, 500 + 1000 * Math.random());
          }
        }
        // Send move ("newmove" event) to people in the room (if our turn)
        if (moveCol == this.game.mycolor && !data.receiveMyMove) {
          let sendMove = {
            move: filtered_move,
            index: origMovescount,
            // color is required to check if this is my move (if several tabs opened)
            color: moveCol,
            cancelDrawOffer: this.drawOffer == ""
          };
          if (this.game.type == "live")
            sendMove["clock"] = this.game.clocks[colorIdx];
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
        V.PlayOnBoard(this.vr.board, move);
        const position = this.vr.getBaseFen();
        V.UndoOnBoard(this.vr.board, move);
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
        return p.sid == this.st.user.sid || p.uid == this.st.user.id;
      });
      if (myIdx >= 0) {
        // OK, I play in this game
        const scoreObj = {
          score: score,
          scoreMsg: scoreMsg
        };
        if (this.game.type == "live") {
          GameStorage.update(this.gameRef.id, scoreObj);
          if (!!callback) callback();
        }
        else this.updateCorrGame(scoreObj, callback);
        // Notify the score to main Hall. TODO: only one player (currently double send)
        this.send("result", { gid: this.game.id, score: score });
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
    height: 24px
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
