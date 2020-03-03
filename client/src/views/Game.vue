<template lang="pug">
main
  input#modalChat.modal(
    type="checkbox"
    @click="resetChatColor()"
  )
  div#chatWrap(
    role="dialog"
    data-checkbox="modalChat"
  )
    #chat.card
      label.modal-close(for="modalChat")
      #participants
        span {{ Object.keys(people).length + " " + st.tr["participant(s):"] }} 
        span(
          v-for="p in Object.values(people)"
          v-if="!!p.name"
        )
          | {{ p.name }} 
        span.anonymous(v-if="Object.values(people).some(p => !p.name)")
          | + @nonymous
      Chat(
        :players="game.players"
        :pastChats="game.chats"
        :newChat="newChat"
        @mychat="processChat"
        @chatcleared="clearChat"
      )
  .row
    #aboveBoard.col-sm-12.col-md-9.col-md-offset-3.col-lg-10.col-lg-offset-2
      span.variant-cadence {{ game.cadence }}
      span.variant-name {{ game.vname }}
      button#chatBtn(onClick="window.doClick('modalChat')") Chat
      #actions(v-if="game.score=='*'")
        button(
          @click="clickDraw()"
          :class="{['draw-' + drawOffer]: true}"
        )
          | {{ st.tr["Draw"] }}
        button(
          v-if="!!game.mycolor"
          @click="abortGame()"
        )
          | {{ st.tr["Abort"] }}
        button(
          v-if="!!game.mycolor"
          @click="resign()"
        )
          | {{ st.tr["Resign"] }}
      #playersInfo
        p
          span.name(:class="{connected: isConnected(0)}")
            | {{ game.players[0].name || "@nonymous" }}
          span.time(v-if="game.score=='*'") {{ virtualClocks[0] }}
          span.split-names -
          span.name(:class="{connected: isConnected(1)}")
            | {{ game.players[1].name || "@nonymous" }}
          span.time(v-if="game.score=='*'") {{ virtualClocks[1] }}
  BaseGame(
    ref="basegame"
    :game="game"
    @newmove="processMove"
    @gameover="gameOver"
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
import { processModalClick } from "@/utils/modalClick";
import { getFullNotation } from "@/utils/notation";
import { playMove, getFilteredMove } from "@/utils/playUndo";
import { getScoreMessage } from "@/utils/scoring";
import { ArrayFun } from "@/utils/array";
import params from "@/parameters";
export default {
  name: "my-game",
  components: {
    BaseGame,
    Chat
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      gameRef: {
        // rid = remote (socket) ID
        id: "",
        rid: ""
      },
      game: {
        // Passed to BaseGame
        players: [{ name: "" }, { name: "" }],
        chats: [],
        rendered: false
      },
      virtualClocks: [0, 0], //initialized with true game.clocks
      vr: null, //"variant rules" object initialized from FEN
      drawOffer: "",
      people: {}, //players + observers
      onMygames: [], //opponents (or me) on "MyGames" page
      lastate: undefined, //used if opponent send lastate before game is ready
      repeat: {}, //detect position repetition
      newChat: "",
      conn: null,
      connexionString: "",
      // Related to (killing of) self multi-connects:
      newConnect: {},
      killed: {}
    };
  },
  watch: {
    $route: function(to) {
      this.gameRef.id = to.params["id"];
      this.gameRef.rid = to.query["rid"];
      this.loadGame();
    }
  },
  // NOTE: some redundant code with Hall.vue (mostly related to people array)
  created: function() {
    // Always add myself to players' list
    const my = this.st.user;
    this.$set(this.people, my.sid, { id: my.id, name: my.name });
    this.gameRef.id = this.$route.params["id"];
    this.gameRef.rid = this.$route.query["rid"]; //may be undefined
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
  mounted: function() {
    document
      .getElementById("chatWrap")
      .addEventListener("click", processModalClick);
  },
  beforeDestroy: function() {
    this.send("disconnect");
  },
  methods: {
    roomInit: function() {
      // Notify the room only now that I connected, because
      // messages might be lost otherwise (if game loading is slow)
      this.send("connect");
      this.send("pollclients");
    },
    send: function(code, obj) {
      if (this.conn)
        this.conn.send(JSON.stringify(Object.assign({ code: code }, obj)));
    },
    isConnected: function(index) {
      const player = this.game.players[index];
      // Is it me ?
      if (this.st.user.sid == player.sid || this.st.user.id == player.uid)
        return true;
      // Try to find a match in people:
      return (
        (
          player.sid &&
          Object.keys(this.people).some(sid => sid == player.sid)
        )
        ||
        (
          player.uid &&
          Object.values(this.people).some(p => p.id == player.uid)
        )
      );
    },
    resetChatColor: function() {
      // TODO: this is called twice, once on opening an once on closing
      document.getElementById("chatBtn").classList.remove("somethingnew");
    },
    processChat: function(chat) {
      this.send("newchat", { data: chat });
      // NOTE: anonymous chats in corr games are not stored on server (TODO?)
      if (this.game.type == "corr" && this.st.user.id > 0)
        GameStorage.update(this.gameRef.id, { chat: chat });
    },
    clearChat: function() {
      // Nothing more to do if game is live (chats not recorded)
      if (this.game.type == "corr") {
        if (this.game.mycolor)
          ajax("/chats", "DELETE", {gid: this.game.id});
        this.game.chats = [];
      }
    },
    // Notify turn after a new move (to opponent and me on MyGames page)
    notifyTurn: function(sid) {
      const player = this.people[sid];
      const colorIdx = this.game.players.findIndex(
        p => p.sid == sid || p.id == player.id);
      const color = ["w","b"][colorIdx];
      const yourTurn =
        (
          color == "w" &&
          this.game.movesCount % 2 == 0
        )
        ||
        (
          color == "b" &&
          this.game.movesCount % 2 == 1
        );
      this.send("turnchange", { target: sid, yourTurn: yourTurn });
    },
    socketMessageListener: function(msg) {
      if (!this.conn) return;
      const data = JSON.parse(msg.data);
      switch (data.code) {
        case "pollclients":
          data.sockIds.forEach(sid => {
            this.$set(this.people, sid, { id: 0, name: "" });
            if (sid != this.st.user.sid) {
              this.send("askidentity", { target: sid });
              // Ask potentially missed last state, if opponent and I play
              if (
                !!this.game.mycolor &&
                this.game.type == "live" &&
                this.game.score == "*" &&
                this.game.players.some(p => p.sid == sid)
              ) {
                this.send("asklastate", { target: sid });
              }
            }
          });
          break;
        case "connect":
          if (!this.people[data.from])
            // TODO: people array should be init only after identity is known
            this.$set(this.people, data.from, { name: "", id: 0 });
          if (!this.people[data.from].name) {
            this.newConnect[data.from] = true; //for self multi-connects tests
            this.send("askidentity", { target: data.from });
          }
          break;
        case "disconnect":
          this.$delete(this.people, data.from);
          break;
        case "mconnect":
        {
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
        case "killed":
          // I logged in elsewhere:
          this.conn = null;
          alert(this.st.tr["New connexion detected: tab now offline"]);
          break;
        case "askidentity": {
          // Request for identification (TODO: anonymous shouldn't need to reply)
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
          // TODO: init people array here.
          const user = data.data;
          if (user.name) {
            // If I multi-connect, kill current connexion if no mark (I'm older)
            if (
              this.newConnect[user.sid] &&
              user.id > 0 &&
              user.id == this.st.user.id &&
              user.sid != this.st.user.sid
            ) {
              if (!this.killed[this.st.user.sid]) {
                this.send("killme", { sid: this.st.user.sid });
                this.killed[this.st.user.sid] = true;
              }
            }
            if (user.sid != this.st.user.sid) {
              //I already know my identity...
              this.$set(this.people, user.sid, {
                id: user.id,
                name: user.name
              });
            }
          }
          delete this.newConnect[user.sid];
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
          this.send("fullgame", { data: this.game, target: data.from });
          break;
        case "fullgame":
          // Callback "roomInit" to poll clients only after game is loaded
          let game = data.data;
          // Move format isn't the same in storage and in browser,
          // because of the 'addTime' field.
          game.moves = game.moves.map(m => { return m.move || m; });
          this.loadGame(game, this.roomInit);
          break;
        case "asklastate":
          // Sending last state if I played a move or score != "*"
          if (
            (this.game.moves.length > 0 && this.vr.turn != this.game.mycolor) ||
            this.game.score != "*" ||
            this.drawOffer == "sent"
          ) {
            // Send our "last state" informations to opponent
            const L = this.game.moves.length;
            const myIdx = ["w", "b"].indexOf(this.game.mycolor);
            const myLastate = {
              // NOTE: lastMove (when defined) includes addTime
              lastMove: L > 0 ? this.game.moves[L - 1] : undefined,
              // Since we played a move (or abort or resign),
              // only drawOffer=="sent" is possible
              drawSent: this.drawOffer == "sent",
              score: this.game.score,
              movesCount: L,
              initime: this.game.initime[1 - myIdx] //relevant only if I played
            };
            this.send("lastate", { data: myLastate, target: data.from });
          }
          break;
        case "lastate": //got opponent infos about last move
          this.lastate = data.data;
          if (this.game.rendered)
            // Game is rendered (Board component)
            this.processLastate();
          // Else: will be processed when game is ready
          break;
        case "newmove": {
          const move = data.data;
          if (move.cancelDrawOffer) {
            // Opponent refuses draw
            this.drawOffer = "";
            // NOTE for corr games: drawOffer reset by player in turn
            if (this.game.type == "live" && !!this.game.mycolor)
              GameStorage.update(this.gameRef.id, { drawOffer: "" });
          }
          this.$refs["basegame"].play(
            move.move,
            "received",
            null,
            {addTime: move.addTime});
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
    // lastate was received, but maybe game wasn't ready yet:
    processLastate: function() {
      const data = this.lastate;
      this.lastate = undefined; //security...
      const L = this.game.moves.length;
      if (data.movesCount > L) {
        // Just got last move from him
        this.$refs["basegame"].play(
          data.lastMove.move,
          "received",
          null,
          {addTime: data.lastMove.addTime, initime: data.initime});
      }
      if (data.drawSent) this.drawOffer = "received";
      if (data.score != "*") {
        this.drawOffer = "";
        if (this.game.score == "*") this.gameOver(data.score);
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
        GameStorage.update(this.gameRef.id, { drawOffer: this.game.mycolor });
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
          const L = game.moves.length;
          if (game.score == "*") {
            // Set clocks + initime
            game.clocks = [tc.mainTime, tc.mainTime];
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
        if (game.drawOffer) {
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
            oppid: myIdx < 0 ? undefined : game.players[1 - myIdx].uid,
            movesCount: game.moves.length
          },
          game,
        );
        this.re_setClocks();
        this.$nextTick(() => {
          this.game.rendered = true;
          // Did lastate arrive before game was rendered?
          if (this.lastate) this.processLastate();
        });
        if (callback) callback();
      };
      if (game) {
        afterRetrieval(game);
        return;
      }
      if (this.gameRef.rid) {
        // Remote live game: forgetting about callback func... (TODO: design)
        this.send("askfullgame", { target: this.gameRef.rid });
      } else {
        // Local or corr game
        // NOTE: afterRetrieval() is never called if game not found
        GameStorage.get(this.gameRef.id, afterRetrieval);
      }
    },
    re_setClocks: function() {
      if (this.game.movesCount < 2 || this.game.score != "*") {
        // 1st move not completed yet, or game over: freeze time
        this.virtualClocks = this.game.clocks.map(s => ppt(s));
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
        return ppt(this.game.clocks[i] - removeTime);
      });
      let clockUpdate = setInterval(() => {
        if (
          countdown < 0 ||
          this.game.moves.length > currentMovesCount ||
          this.game.score != "*"
        ) {
          clearInterval(clockUpdate);
          if (countdown < 0)
            this.gameOver(
              currentTurn == "w" ? "0-1" : "1-0",
              "Time"
            );
        } else
          this.$set(
            this.virtualClocks,
            colorIdx,
            ppt(Math.max(0, --countdown))
          );
      }, 1000);
    },
    // Post-process a (potentially partial) move (which was just played in BaseGame)
    // TODO?: wait for AJAX return to finish processing a move,
    //   and for opponent pingback in case of live game : if none received after e.g. 500ms, re-send newmove
    //   ...and provide move index with newmove event for basic check after receiving
    processMove: function(move, data) {
      const moveCol = this.vr.turn;
      const doProcessMove = () => {
        const colorIdx = ["w", "b"].indexOf(moveCol);
        const nextIdx = 1 - colorIdx;
        if (this.game.mycolor) {
          // NOTE: 'var' to see that variable outside this block
          var filtered_move = getFilteredMove(move);
        }
        // Send move ("newmove" event) to people in the room (if our turn)
        let addTime = (data && this.game.type == "live") ? data.addTime : 0;
        if (moveCol == this.game.mycolor) {
          if (this.drawOffer == "received")
            // I refuse draw
            this.drawOffer = "";
          // 'addTime' is irrelevant for corr games:
          if (this.game.type == "live" && this.game.movesCount >= 2) {
            const elapsed = Date.now() - this.game.initime[colorIdx];
            // elapsed time is measured in milliseconds
            addTime = this.game.increment - elapsed / 1000;
          }
          const sendMove = {
            move: filtered_move,
            addTime: addTime, //undefined for corr games
            cancelDrawOffer: this.drawOffer == "",
            // Players' SID required for /mygames page
            // TODO: precompute and add this field to game object?
            players: this.game.players.map(p => p.sid)
          };
          this.send("newmove", { data: sendMove });
        }
        // Update current game object (no need for moves stack):
        playMove(move, this.vr);
        this.game.movesCount++;
        // TODO: notifyTurn
        // (add)Time indication: useful in case of lastate infos requested
        this.game.moves.push(this.game.type == "live"
          ? {move:move, addTime:addTime}
          : move);
        this.game.fen = this.vr.getFen();
        if (this.game.type == "live") this.game.clocks[colorIdx] += addTime;
        // In corr games, just reset clock to mainTime:
        else this.game.clocks[colorIdx] = extractTime(this.game.cadence).mainTime;
        // data.initime is set only when I receive a "lastate" move from opponent
        this.game.initime[nextIdx] = (data && data.initime) ? data.initime : Date.now();
        this.re_setClocks();
        // If repetition detected, consider that a draw offer was received:
        const fenObj = V.ParseFen(this.game.fen);
        let repIdx = fenObj.position + "_" + fenObj.turn;
        if (fenObj.flags) repIdx += "_" + fenObj.flags;
        this.repeat[repIdx] = this.repeat[repIdx] ? this.repeat[repIdx] + 1 : 1;
        if (this.repeat[repIdx] >= 3) this.drawOffer = "threerep";
        else if (this.drawOffer == "threerep") this.drawOffer = "";
        // Since corr games are stored at only one location, update should be
        // done only by one player for each move:
        if (
          this.game.mycolor &&
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
            GameStorage.update(this.gameRef.id, {
              fen: this.game.fen,
              move: {
                squares: filtered_move,
                played: Date.now(),
                idx: this.game.moves.length - 1
              },
              // Code "n" for "None" to force reset (otherwise it's ignored)
              drawOffer: drawCode || "n"
            });
          }
          else {
            // Live game:
            GameStorage.update(this.gameRef.id, {
              fen: this.game.fen,
              move: filtered_move,
              clocks: this.game.clocks,
              initime: this.game.initime,
              drawOffer: drawCode
            });
          }
        }
      };
      if (this.game.type == "corr" && moveCol == this.game.mycolor) {
        setTimeout(() => {
          if (
            !confirm(
              this.st.tr["Move played:"] +
                " " +
                getFullNotation(move) +
                "\n" +
                this.st.tr["Are you sure?"]
            )
          ) {
            this.$refs["basegame"].cancelLastMove();
            return;
          }
          doProcessMove();
        // Let small time to finish drawing current move attempt:
        }, 500);
      }
      else doProcessMove();
    },
    gameOver: function(score, scoreMsg) {
      this.game.score = score;
      this.$set(this.game, "scoreMsg", scoreMsg || getScoreMessage(score));
      const myIdx = this.game.players.findIndex(p => {
        return p.sid == this.st.user.sid || p.uid == this.st.user.id;
      });
      if (myIdx >= 0) {
        // OK, I play in this game
        GameStorage.update(this.gameRef.id, {
          score: score,
          scoreMsg: scoreMsg
        });
        // Notify the score to main Hall. TODO: only one player (currently double send)
        this.send("result", { gid: this.game.id, score: score });
      }
    }
  }
};
</script>

<style lang="sass" scoped>
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

.name
  font-size: 1.5rem
  padding: 1px

.time
  font-size: 2rem
  display: inline-block
  margin-left: 10px

.split-names
  display: inline-block
  margin: 0 15px

#chat
  padding-top: 20px
  max-width: 767px
  border: none;

#chatBtn
  margin: 0 10px 0 0

.draw-sent, .draw-sent:hover
  background-color: lightyellow

.draw-received, .draw-received:hover
  background-color: lightgreen

.draw-threerep, .draw-threerep:hover
  background-color: #e4d1fc

.somethingnew
  background-color: #c5fefe
</style>
