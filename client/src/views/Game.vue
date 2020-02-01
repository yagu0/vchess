<template lang="pug">
main
  input#modalChat.modal(type="checkbox" @change="toggleChat")
  div#chatWrap(role="dialog" data-checkbox="modalChat"
      aria-labelledby="inputChat")
    #chat.card
      label.modal-close(for="modalChat")
      Chat(:players="game.players" :pastChats="game.chats"
        @newchat-sent="finishSendChat" @newchat-received="processChat")
  .row
    #aboveBoard.col-sm-12.col-md-9.col-md-offset-3.col-lg-10.col-lg-offset-2
      button#chatBtn(onClick="doClick('modalChat')") Chat
      #actions(v-if="game.mode!='analyze' && game.score=='*'")
        button(@click="clickDraw" :class="{['draw-' + drawOffer]: true}") Draw
        button(@click="abortGame") Abort
        button(@click="resign") Resign
      #playersInfo
        p
          span.name(:class="{connected: isConnected(0)}") {{ game.players[0].name }}
          span.time(v-if="game.score=='*'") {{ virtualClocks[0] }}
          span.split-names -
          span.name(:class="{connected: isConnected(1)}") {{ game.players[1].name }}
          span.time(v-if="game.score=='*'") {{ virtualClocks[1] }}
  BaseGame(:game="game" :vr="vr" ref="basegame"
    @newmove="processMove" @gameover="gameOver")
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import Chat from "@/components/Chat.vue";
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ppt } from "@/utils/datetime";
import { extractTime } from "@/utils/timeControl";
import { ArrayFun } from "@/utils/array";
import { processModalClick } from "@/utils/modalClick";

export default {
  name: 'my-game',
  components: {
    BaseGame,
    Chat,
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      gameRef: { //given in URL (rid = remote ID)
        id: "",
        rid: ""
      },
      game: {players:[{name:""},{name:""}]}, //passed to BaseGame
      virtualClocks: [0, 0], //initialized with true game.clocks
      vr: null, //"variant rules" object initialized from FEN
      drawOffer: "",
      people: {}, //players + observers
      lastate: undefined, //used if opponent send lastate before game is ready
      repeat: {}, //detect position repetition
    };
  },
  watch: {
    "$route": function(to, from) {
      this.gameRef.id = to.params["id"];
      this.gameRef.rid = to.query["rid"];
      this.loadGame();
    },
    "game.clocks": function(newState) {
      if (this.game.moves.length < 2 || this.game.score != "*")
      {
        // 1st move not completed yet, or game over: freeze time
        this.virtualClocks = newState.map(s => ppt(s));
        return;
      }
      const currentTurn = this.vr.turn;
      const colorIdx = ["w","b"].indexOf(currentTurn);
      let countdown = newState[colorIdx] -
        (Date.now() - this.game.initime[colorIdx])/1000;
      this.virtualClocks = [0,1].map(i => {
        const removeTime = i == colorIdx
          ? (Date.now() - this.game.initime[colorIdx])/1000
          : 0;
        return ppt(newState[i] - removeTime);
      });
      let clockUpdate = setInterval(() => {
        if (countdown < 0 || this.vr.turn != currentTurn || this.game.score != "*")
        {
          clearInterval(clockUpdate);
          if (countdown < 0)
            this.gameOver(this.vr.turn=="w" ? "0-1" : "1-0", "Time");
        }
        else
        {
          // TODO: with Vue 3, just do this.virtualClocks[colorIdx] = ppt(--countdown)
          this.$set(this.virtualClocks, colorIdx, ppt(Math.max(0, --countdown)));
        }
      }, 1000);
    },
  },
  // NOTE: some redundant code with Hall.vue (related to people array)
  created: function() {
    // Always add myself to players' list
    const my = this.st.user;
    this.$set(this.people, my.sid, {id:my.id, name:my.name});
    this.gameRef.id = this.$route.params["id"];
    this.gameRef.rid = this.$route.query["rid"]; //may be undefined
    // Define socket .onmessage() and .onclose() events:
    this.st.conn.onmessage = this.socketMessageListener;
    const socketCloseListener = () => {
      store.socketCloseListener(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', this.socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onclose = socketCloseListener;
    // Socket init required before loading remote game:
    const socketInit = (callback) => {
      if (!!this.st.conn && this.st.conn.readyState == 1) //1 == OPEN state
        callback();
      else //socket not ready yet (initial loading)
        this.st.conn.onopen = callback;
    };
    if (!this.gameRef.rid) //game stored locally or on server
      this.loadGame(null, () => socketInit(this.roomInit));
    else //game stored remotely: need socket to retrieve it
    {
      // NOTE: the callback "roomInit" will be lost, so we don't provide it.
      // --> It will be given when receiving "fullgame" socket event.
      // A more general approach would be to store it somewhere.
      socketInit(this.loadGame);
    }
  },
  mounted: function() {
    document.getElementById("chatWrap").addEventListener(
      "click", processModalClick);
  },
  methods: {
    // O.1] Ask server for room composition:
    roomInit: function() {
      this.st.conn.send(JSON.stringify({code:"pollclients"}));
    },
    isConnected: function(index) {
      const name = this.game.players[index].name;
      if (this.st.user.name == name)
        return true;
      return Object.values(this.people).some(p => p.name == name);
    },
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        case "duplicate":
          alert("Warning: duplicate 'offline' connection");
          break;
        // 0.2] Receive clients list (just socket IDs)
        case "pollclients":
        {
          data.sockIds.forEach(sid => {
            // TODO: understand clearly what happens here, problems when a
            // game is quit, and then launch a new game from hall.
            if (!!this.people[sid])
              return;
            this.$set(this.people, sid, {id:0, name:""});
            // Ask only identity
            this.st.conn.send(JSON.stringify({code:"askidentity", target:sid}));
          });
          break;
        }
        case "askidentity":
        {
          // Request for identification: reply if I'm not anonymous
          if (this.st.user.id > 0)
          {
            this.st.conn.send(JSON.stringify({code:"identity",
              user: {
                // NOTE: decompose to avoid revealing email
                name: this.st.user.name,
                sid: this.st.user.sid,
                id: this.st.user.id,
              },
              target:data.from}));
          }
          break;
        }
        case "identity":
        {
          let player = this.people[data.user.sid];
          // NOTE: sometimes player.id fails because player is undefined...
          // Probably because the event was meant for Hall?
          if (!player)
            return;
          player.id = data.user.id;
          player.name = data.user.name;
          // Sending last state only for live games: corr games are complete
          if (this.game.type == "live" && this.game.oppsid == data.user.sid)
          {
            // Send our "last state" informations to opponent
            const L = this.game.moves.length;
            let lastMove = (L>0 ? this.game.moves[L-1] : undefined);
            if (!!lastMove && this.drawOffer == "sent")
              lastMove.draw = true;
            this.st.conn.send(JSON.stringify({
              code: "lastate",
              target: data.user.sid,
              state:
              {
                lastMove: lastMove,
                score: this.game.score,
                movesCount: L,
                clocks: this.game.clocks,
              }
            }));
          }
          break;
        }
        case "askgame":
          // Send current (live) game
          const myGame =
          {
            // Minimal game informations:
            id: this.game.id,
            players: this.game.players.map(p => { return {name:p.name}; }),
            vid: this.game.vid,
            timeControl: this.game.timeControl,
          };
          this.st.conn.send(JSON.stringify({code:"game",
            game:myGame, target:data.from}));
          break;
        case "newmove":
          this.$set(this.game, "moveToPlay", data.move); //TODO: Vue3...
          break;
        case "lastate": //got opponent infos about last move
        {
          this.lastate = data;
          if (!!this.game.type) //game is loaded
            this.processLastate();
          //else: will be processed when game is ready
          break;
        }
        case "resign":
          this.gameOver(data.side=="b" ? "1-0" : "0-1", "Resign");
          break;
        case "abort":
          this.gameOver("?", "Abort");
          break;
        case "draw":
          this.gameOver("1/2", data.message);
          break;
        case "drawoffer":
          this.drawOffer = "received"; //TODO: observers don't know who offered draw
          break;
        case "askfullgame":
          this.st.conn.send(JSON.stringify({code:"fullgame", game:this.game, target:data.from}));
          break;
        case "fullgame":
          // Callback "roomInit" to poll clients only after game is loaded
          this.loadGame(data.game, this.roomInit);
          break;
        case "connect":
        {
          // TODO: next condition is probably not required. See note line 150
          if (!this.people[data.from])
          {
            this.$set(this.people, data.from, {name:"", id:0});
            this.st.conn.send(JSON.stringify({code:"askidentity", target:data.from}));
          }
          break;
        }
        case "disconnect":
          this.$delete(this.people, data.from);
          break;
      }
    },
    // lastate was received, but maybe game wasn't ready yet:
    processLastate: function() {
      const data = this.lastate;
      this.lastate = undefined; //security...
      const L = this.game.moves.length;
      if (data.movesCount > L)
      {
        // Just got last move from him
        this.$set(this.game, "moveToPlay", data.lastMove);
        if (data.score != "*" && this.game.score == "*")
        {
          // Opponent resigned or aborted game, or accepted draw offer
          // (this is not a stalemate or checkmate)
          this.gameOver(data.score, "Opponent action");
        }
        this.game.clocks = data.clocks; //TODO: check this?
        if (!!data.lastMove.draw)
          this.drawOffer = "received";
      }
    },
    clickDraw: function() {
      if (["received","threerep"].includes(this.drawOffer))
      {
        if (!confirm("Accept draw?"))
          return;
        const message = (this.drawOffer == "received"
          ? "Mutual agreement"
          : "Three repetitions");
        Object.keys(this.people).forEach(sid => {
          if (sid != this.st.user.sid)
          {
            this.st.conn.send(JSON.stringify({code:"draw",
              message:message, target:sid}));
          }
        });
        this.gameOver("1/2", message);
      }
      else if (this.drawOffer == "sent")
      {
        this.drawOffer = "";
        if (this.game.type == "corr")
          GameStorage.update(this.gameRef.id, {drawOffer: false});
      }
      else
      {
        if (!confirm("Offer draw?"))
          return;
        this.drawOffer = "sent";
        Object.keys(this.people).forEach(sid => {
          if (sid != this.st.user.sid)
            this.st.conn.send(JSON.stringify({code:"drawoffer", target:sid}));
        });
        if (this.game.type == "corr")
          GameStorage.update(this.gameRef.id, {drawOffer: true});
      }
    },
    abortGame: function() {
      if (!confirm(this.st.tr["Terminate game?"]))
        return;
      this.gameOver("?", "Abort");
      Object.keys(this.people).forEach(sid => {
        if (sid != this.st.user.sid)
        {
          this.st.conn.send(JSON.stringify({
            code: "abort",
            target: sid,
          }));
        }
      });
    },
    resign: function(e) {
      if (!confirm("Resign the game?"))
        return;
      Object.keys(this.people).forEach(sid => {
        if (sid != this.st.user.sid)
        {
          this.st.conn.send(JSON.stringify({code:"resign",
            side:this.game.mycolor, target:sid}));
        }
      });
      this.gameOver(this.game.mycolor=="w" ? "0-1" : "1-0", "Resign");
    },
    // 3 cases for loading a game:
    //  - from indexedDB (running or completed live game I play)
    //  - from server (one correspondance game I play[ed] or not)
    //  - from remote peer (one live game I don't play, finished or not)
    loadGame: function(game, callback) {
      const afterRetrieval = async (game) => {
        const vModule = await import("@/variants/" + game.vname + ".js");
        window.V = vModule.VariantRules;
        this.vr = new V(game.fen);
        const gtype = (game.timeControl.indexOf('d') >= 0 ? "corr" : "live");
        const tc = extractTime(game.timeControl);
        if (gtype == "corr")
        {
          if (game.players[0].color == "b")
          {
            // Adopt the same convention for live and corr games: [0] = white
            [ game.players[0], game.players[1] ] =
              [ game.players[1], game.players[0] ];
          }
          // corr game: needs to compute the clocks + initime
          // NOTE: clocks in seconds, initime in milliseconds
          game.clocks = [tc.mainTime, tc.mainTime];
          game.moves.sort((m1,m2) => m1.idx - m2.idx); //in case of
          if (game.score == "*") //otherwise no need to bother with time
          {
            game.initime = [0, 0];
            const L = game.moves.length;
            if (L >= 3)
            {
              let addTime = [0, 0];
              for (let i=2; i<L; i++)
              {
                addTime[i%2] += tc.increment -
                  (game.moves[i].played - game.moves[i-1].played) / 1000;
              }
              for (let i=0; i<=1; i++)
                game.clocks[i] += addTime[i];
            }
            if (L >= 1)
              game.initime[L%2] = game.moves[L-1].played;
            if (game.drawOffer)
              this.drawOffer = "received";
          }
          // Now that we used idx and played, re-format moves as for live games
          game.moves = game.moves.map( (m) => {
            const s = m.squares;
            return {
              appear: s.appear,
              vanish: s.vanish,
              start: s.start,
              end: s.end,
            };
          });
          // Also sort chat messages (if any)
          game.chats.sort( (c1,c2) => { return c2.added - c1.added; });
        }
        const myIdx = game.players.findIndex(p => {
          return p.sid == this.st.user.sid || p.uid == this.st.user.id;
        });
        if (gtype == "live" && game.clocks[0] < 0) //game unstarted
        {
          game.clocks = [tc.mainTime, tc.mainTime];
          if (game.score == "*")
          {
            game.initime[0] = Date.now();
            if (myIdx >= 0)
            {
              // I play in this live game; corr games don't have clocks+initime
              GameStorage.update(game.id,
              {
                clocks: game.clocks,
                initime: game.initime,
              });
            }
          }
        }
        this.game = Object.assign({},
          game,
          // NOTE: assign mycolor here, since BaseGame could also be VS computer
          {
            type: gtype,
            increment: tc.increment,
            mycolor: [undefined,"w","b"][myIdx+1],
            // opponent sid not strictly required (or available), but easier
            // at least oppsid or oppid is available anyway:
            oppsid: (myIdx < 0 ? undefined : game.players[1-myIdx].sid),
            oppid: (myIdx < 0 ? undefined : game.players[1-myIdx].uid),
          }
        );
        this.repeat = {}; //reset
        if (!!this.lastate) //lastate arrived before game was loaded:
          this.processLastate();
        callback();
      };
      if (!!game)
        return afterRetrieval(game);
      if (!!this.gameRef.rid)
      {
        // Remote live game: forgetting about callback func... (TODO: design)
        this.st.conn.send(JSON.stringify(
          {code:"askfullgame", target:this.gameRef.rid}));
      }
      else
      {
        // Local or corr game
        GameStorage.get(this.gameRef.id, afterRetrieval);
      }
    },
    // Post-process a move (which was just played)
    processMove: function(move) {
      // Update storage (corr or live) if I play in the game
      const colorIdx = ["w","b"].indexOf(move.color);
      // https://stackoverflow.com/a/38750895
      if (!!this.game.mycolor)
      {
        const allowed_fields = ["appear", "vanish", "start", "end"];
        // NOTE: 'var' to see this variable outside this block
        var filtered_move = Object.keys(move)
          .filter(key => allowed_fields.includes(key))
          .reduce((obj, key) => {
            obj[key] = move[key];
            return obj;
          }, {});
      }
      // Send move ("newmove" event) to people in the room (if our turn)
      let addTime = 0;
      if (move.color == this.game.mycolor)
      {
        if (this.game.moves.length >= 2) //after first move
        {
          const elapsed = Date.now() - this.game.initime[colorIdx];
          // elapsed time is measured in milliseconds
          addTime = this.game.increment - elapsed/1000;
        }
        let sendMove = Object.assign({}, filtered_move, {addTime: addTime});
        Object.keys(this.people).forEach(sid => {
          if (sid != this.st.user.sid)
          {
            this.st.conn.send(JSON.stringify({
              code: "newmove",
              target: sid,
              move: sendMove,
            }));
          }
        });
      }
      else
        addTime = move.addTime; //supposed transmitted
      const nextIdx = ["w","b"].indexOf(this.vr.turn);
      // Since corr games are stored at only one location, update should be
      // done only by one player for each move:
      if (!!this.game.mycolor &&
        (this.game.type == "live" || move.color == this.game.mycolor))
      {
        if (this.game.type == "corr")
        {
          GameStorage.update(this.gameRef.id,
          {
            fen: move.fen,
            move:
            {
              squares: filtered_move,
              played: Date.now(), //TODO: on server?
              idx: this.game.moves.length,
            },
          });
        }
        else //live
        {
          GameStorage.update(this.gameRef.id,
          {
            fen: move.fen,
            move: filtered_move,
            clocks: this.game.clocks.map((t,i) => i==colorIdx
              ? this.game.clocks[i] + addTime
              : this.game.clocks[i]),
            initime: this.game.initime.map((t,i) => i==nextIdx
              ? Date.now()
              : this.game.initime[i]),
          });
        }
      }
      // Also update current game object:
      this.game.moves.push(move);
      this.game.fen = move.fen;
      //TODO: (Vue3) just this.game.clocks[colorIdx] += addTime;
      this.$set(this.game.clocks, colorIdx, this.game.clocks[colorIdx] + addTime);
      this.game.initime[nextIdx] = Date.now();
      // If repetition detected, consider that a draw offer was received:
      const fenObj = V.ParseFen(move.fen);
      let repIdx = fenObj.position + "_" + fenObj.turn;
      if (!!fenObj.flags)
        repIdx += "_" + fenObj.flags;
      this.repeat[repIdx] = (!!this.repeat[repIdx]
        ? this.repeat[repIdx]+1
        : 1);
      if (this.repeat[repIdx] >= 3)
        this.drawOffer = "threerep";
    },
    toggleChat: function() {
      document.getElementById("chatBtn").style.backgroundColor = "#e2e2e2";
    },
    finishSendChat: function(chat) {
      if (this.game.type == "corr")
        GameStorage.update(this.gameRef.id, {chat: chat});
    },
    processChat: function() {
      if (!document.getElementById("inputChat").checked)
        document.getElementById("chatBtn").style.backgroundColor = "#c5fefe";
    },
    gameOver: function(score, scoreMsg) {
      this.game.mode = "analyze";
      this.game.score = score;
      this.game.scoreMsg = scoreMsg;
      const myIdx = this.game.players.findIndex(p => {
        return p.sid == this.st.user.sid || p.uid == this.st.user.id;
      });
      if (myIdx >= 0) //OK, I play in this game
      {
        GameStorage.update(this.gameRef.id,
          {score: score, scoreMsg: scoreMsg});
      }
    },
  },
};
</script>

<style lang="sass">
.connected
  background-color: lightgreen

@media screen and (min-width: 768px)
  #actions
    width: 300px
@media screen and (max-width: 767px)
  .game
    width: 100%

#actions
  display: inline-block
  margin-top: 10px
  button
    display: inline-block
    width: 33%
    margin: 0

@media screen and (max-width: 767px)
  #aboveBoard
    text-align: center

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
  max-width: 600px
  border: none;

#chatBtn
  margin: 0 10px 0 0

.draw-sent, .draw-sent:hover
  background-color: lightyellow

.draw-received, .draw-received:hover
  background-color: lightgreen

.draw-threerep, .draw-threerep:hover
  background-color: #e4d1fc
</style>
