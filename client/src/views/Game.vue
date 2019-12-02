<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    input#modalAbort.modal(type="checkbox")
    div(role="dialog" aria-labelledby="abortBoxTitle")
      .card.smallpad.small-modal.text-center
        label.modal-close(for="modalAbort")
        h3#abortBoxTitle.section {{ st.tr["Terminate game?"] }}
        button(@click="abortGame") {{ st.tr["Sorry I have to go"] }}
        button(@click="abortGame") {{ st.tr["Game seems over"] }}
        button(@click="abortGame") {{ st.tr["Game is too boring"] }}
    BaseGame(:game="game" :vr="vr" ref="basegame"
      @newmove="processMove" @gameover="gameOver")
    // TODO: also show players names
    div Time: {{ virtualClocks[0] }} - {{ virtualClocks[1] }}
    .button-group(v-if="game.mode!='analyze' && game.score=='*'")
      button(@click="offerDraw") Draw
      button(@click="() => abortGame()") Abort
      button(@click="resign") Resign
    div(v-if="game.mode=='corr'")
      textarea(v-show="score=='*' && vr.turn==game.mycolor" v-model="corrMsg")
      div(v-show="cursor>=0") {{ moves[cursor].message }}
</template>

<!--
// TODO: movelist dans basegame et chat ici
// ==> après, implémenter/vérifier les passages de challenges + parties en cours
// observer,
// + problèmes, habiller et publier. (+ corr...)
    // TODO: how to know who is observing ? Send message to everyone with game ID ?
    // and then just listen to (dis)connect events
    // server always send "connect on " + URL ; then add to observers if game...
// router when access a game page tell to server I joined + game ID (no need rid)
// and ask server for current joined (= observers)
// when send to chat (or a move), reach only this group (send gid along)
// -> doivent être enregistrés comme observers au niveau du serveur...
    // non: poll users + events startObserving / stopObserving
    // (à faire au niveau du routeur ?)
-->

<script>
import BaseGame from "@/components/BaseGame.vue";
//import Chat from "@/components/Chat.vue";
//import MoveList from "@/components/MoveList.vue";
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ppt } from "@/utils/datetime";
import { extractTime } from "@/utils/timeControl";

export default {
  name: 'my-game',
  components: {
    BaseGame,
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      gameRef: { //given in URL (rid = remote ID)
        id: "",
        rid: ""
      },
      game: { }, //passed to BaseGame
      oppConnected: false,
      corrMsg: "", //to send offline messages in corr games
      virtualClocks: [0, 0], //initialized with true game.clocks
      vr: null, //"variant rules" object initialized from FEN
      drawOffer: "", //TODO: use for button style
      people: [ ], //potential observers (TODO)
    };
  },
  watch: {
    '$route' (to, from) {
      if (!!to.params["id"])
      {
        this.gameRef.id = to.params["id"];
        this.gameRef.rid = to.query["rid"];
        this.loadGame();
      }
    },
    "game.clocks": function(newState) {
      if (this.game.moves.length < 2)
      {
        // 1st move not completed yet: freeze time
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
      const myTurn = (currentTurn == this.game.mycolor);
      let clockUpdate = setInterval(() => {
        if (countdown <= 0 || this.vr.turn != currentTurn)
        {
          clearInterval(clockUpdate);
          if (countdown <= 0 && myTurn)
          {
            this.$refs["basegame"].endGame(
              this.game.mycolor=="w" ? "0-1" : "1-0", "Time");
            this.st.conn.send(JSON.stringify({
              code: "timeover",
              target: this.game.oppid,
            }));
          }
        }
        else
        {
          // TODO: with Vue 3, just do this.virtualClocks[colorIdx] = ppt(--countdown)
          this.$set(this.virtualClocks, colorIdx, ppt(Math.max(0, --countdown)));
        }
      }, 1000);
    },
    // In case variants array was't loaded when game was retrieved
    "st.variants": function(variantArray) {
      if (!!this.game.vname && this.game.vname == "")
        this.game.vname = variantArray.filter(v => v.id == this.game.vid)[0].name;
    },
  },
  created: function() {
    if (!!this.$route.params["id"])
    {
      this.gameRef.id = this.$route.params["id"];
      this.gameRef.rid = this.$route.query["rid"];
      this.loadGame();
    }
    // TODO: onopen, ask lastState informations + update observers and players status
    const socketCloseListener = () => {
      store.socketCloseListener(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', this.socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onmessage = this.socketMessageListener;
    this.st.conn.onclose = socketCloseListener;
  },
  methods: {
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        case "newmove":
          // NOTE: next call will trigger processMove()
          this.$refs["basegame"].play(data.move,
            "receive", this.game.vname!="Dark" ? "animate" : null);
          break;
        case "pong": //received if we sent a ping (game still alive on our side)
        {
          this.oppConnected = true;
          // Send our "last state" informations to opponent(s)
          const L = this.game.moves.length;
          this.st.conn.send(JSON.stringify({
            code: "lastate",
            target: this.game.oppid,
            gameId: this.gameRef.id,
            lastMove: (L>0 ? this.game.moves[L-1] : undefined),
            score: this.game.score,
            movesCount: L,
            drawOffer: this.drawOffer,
            clocks: this.game.clocks,
          }));
          break;
        }
        case "lastate": //got opponent infos about last move
        {
          const L = this.game.moves.length;
          if (this.gameRef.id != data.gameId)
            break; //games IDs don't match: nothing we can do...
          // OK, opponent still in game (which might be over)
          if (data.movesCount > L)
          {
            // Just got last move from him
            this.$refs["basegame"].play(data.lastMove, "receive");
            if (data.score != "*" && this.game.score == "*")
            {
              // Opponent resigned or aborted game, or accepted draw offer
              // (this is not a stalemate or checkmate)
              this.$refs["basegame"].endGame(data.score, "Opponent action");
            }
            this.game.clocks = data.clocks;
            this.drawOffer = data.drawOffer;
          }
          else if (data.movesCount < L)
          {
            // We must tell last move to opponent
            this.st.conn.send(JSON.stringify({
              code: "lastate",
              target: this.game.oppid,
              gameId: this.gameRef.id,
              lastMove: (L>0 ? this.game.moves[L-1] : undefined),
              score: this.game.score,
              movesCount: L,
              drawOffer: this.drawOffer,
              clocks: this.game.clocks,
            }));
          }
          break;
        }
        case "resign":
          this.$refs["basegame"].endGame(
            this.game.mycolor=="w" ? "1-0" : "0-1", "Resign");
          break;
        case "timeover":
          this.$refs["basegame"].endGame(
            this.game.mycolor=="w" ? "1-0" : "0-1", "Time");
          break;
        case "abort":
          this.$refs["basegame"].endGame("?", "Abort: " + data.msg);
          break;
        case "draw":
          this.$refs["basegame"].endGame("1/2", "Mutual agreement");
          break;
        case "drawoffer":
          this.drawOffer = "received";
          break;
        case "askfullgame":
          // TODO: just give game; observers are listed here anyway:
          // gameconnect?
          break;
        // TODO: drawaccepted (click draw button before sending move ==> draw offer in move)
          // ==> on "newmove", check "drawOffer" field
        // TODO: also use (dis)connect info to count online players?
        case "gameconnect":
        case "gamedisconnect":
          const online = (data.code == "gameconnect");
          // If this is an opponent ?
          if (this.game.oppid == data.id)
            this.oppConnected = true;
          else
          {
            // Or an observer ?
            if (!online)
              delete this.people[data.id];
            else
              this.people[data.id] = data.name;
          }
          break;
      }
    },
    offerDraw: function() {
      // TODO: also for corr games
      if (this.drawOffer == "received")
      {
        if (!confirm("Accept draw?"))
          return;
        this.st.conn.send(JSON.stringify({code:"draw", target:this.game.oppid}));
        this.$refs["basegame"].endGame("1/2", "Mutual agreement");
      }
      else if (this.drawOffer == "sent")
        this.drawOffer = "";
      else
      {
        if (!confirm("Offer draw?"))
          return;
        this.st.conn.send(JSON.stringify({code:"drawoffer", target:this.game.oppid}));
      }
    },
    // + conn handling: "draw" message ==> agree for draw (if we have "drawOffered" at true)
    receiveDrawOffer: function() {
      //if (...)
      // TODO: ignore if preventDrawOffer is set; otherwise show modal box with option "prevent future offers"
      // if accept: send message "draw"
    },
    abortGame: function(event) {
      let modalBox = document.getElementById("modalAbort");
      if (!event)
      {
        // First call show options:
        modalBox.checked = true;
      }
      else
      {
        modalBox.checked = false; //decision made: box disappear
        const message = event.target.innerText;
        // Next line will trigger a "gameover" event, bubbling up till here
        this.$refs["basegame"].endGame("?", "Abort: " + message);
        this.st.conn.send(JSON.stringify({
          code: "abort",
          msg: message,
          target: this.game.oppid,
        }));
      }
    },
    resign: function(e) {
      if (!confirm("Resign the game?"))
        return;
      this.st.conn.send(JSON.stringify({
        code: "resign",
        target: this.game.oppid,
      }));
      // Next line will trigger a "gameover" event, bubbling up till here
      this.$refs["basegame"].endGame(
        this.game.mycolor=="w" ? "0-1" : "1-0", "Resign");
    },
    // 3 cases for loading a game:
    //  - from indexedDB (running or completed live game I play)
    //  - from server (one correspondance game I play[ed] or not)
    //  - from remote peer (one live game I don't play, finished or not)
    loadGame: function(game) {
      const afterRetrieval = async (game) => {
        // NOTE: variants array might not be available yet, thus the two next lines
        const variantCell = this.st.variants.filter(v => v.id == game.vid);
        const vname = (variantCell.length > 0 ? variantCell[0].name : "");
        if (!game.fen)
          game.fen = game.fenStart; //game wasn't started
        const gtype = (game.timeControl.indexOf('d') >= 0 ? "corr" : "live");
        if (gtype == "corr")
        {
          // corr game: needs to compute the clocks + initime
          //if (game.players[i].rtime < 0) initime = Date.now(), else compute,
          //also using move.played fields
          game.clocks = [-1, -1];
          game.initime = [0, 0];
          // TODO: compute clocks + initime
        }
        const tc = extractTime(game.timeControl);
        const myIdx = game.players.findIndex(p => p.sid == this.st.user.sid);
        if (game.clocks[0] < 0) //game unstarted
        {
          game.clocks = [tc.mainTime, tc.mainTime];
          game.initime[0] = Date.now();
          if (myIdx >= 0) //I play in this game
          {
            GameStorage.update(game.gameId,
            {
              clocks: game.clocks,
              initime: game.initime,
            });
          }
        }
        const vModule = await import("@/variants/" + vname + ".js");
        window.V = vModule.VariantRules;
        this.vr = new V(game.fen);
        this.game = Object.assign({},
          game,
          // NOTE: assign mycolor here, since BaseGame could also bs VS computer
          {
            type: gtype,
            increment: tc.increment,
            vname: vname,
            mycolor: [undefined,"w","b"][myIdx+1],
            // opponent sid not strictly required, but easier
            oppid: (myIdx < 0 ? undefined : game.players[1-myIdx].sid),
          }
        );
        if (!!this.game.oppid)
        {
          // Send ping to server (answer pong if players[s] are connected)
          this.st.conn.send(JSON.stringify({code:"ping", target:this.game.oppid}));
        }
      };
      if (!!game)
        return afterRetrival(game);
      if (!!this.gameRef.rid)
      {
        this.st.conn.send(JSON.stringify({code:"askfullgame", target:this.gameRef.rid}));
        // TODO: just send a game request message to the remote player,
        // and when receiving answer just call loadGame(received_game)
        // + remote peer should have registered us as an observer
        // (send moves updates + resign/abort/draw actions)
      }
      else
      {
        GameStorage.get(this.gameRef.id, async (game) => {
          afterRetrieval(game);
        });
      }
    },
    // Post-process a move (which was just played)
    processMove: function(move) {
      if (!this.game.mycolor)
        return; //I'm just an observer
      // Update storage (corr or live)
      const colorIdx = ["w","b"].indexOf(move.color);
      // https://stackoverflow.com/a/38750895
      const allowed_fields = ["appear", "vanish", "start", "end"];
      const filtered_move = Object.keys(move)
        .filter(key => allowed_fields.includes(key))
        .reduce((obj, key) => {
          obj[key] = move[key];
          return obj;
        }, {});
      // Send move ("newmove" event) to opponent(s) (if ours)
      let addTime = 0;
      if (move.color == this.game.mycolor)
      {
        if (this.game.moves.length >= 2) //after first move
        {
          const elapsed = Date.now() - this.game.initime[colorIdx];
          // elapsed time is measured in milliseconds
          addTime = this.game.increment - elapsed/1000;
        }
        this.st.conn.send(JSON.stringify({
          code: "newmove",
          target: this.game.oppid,
          move: Object.assign({}, filtered_move, {addTime: addTime}),
        }));
      }
      else
        addTime = move.addTime; //supposed transmitted
      const nextIdx = ["w","b"].indexOf(this.vr.turn);
      GameStorage.update(this.gameRef.id,
      {
        move: filtered_move,
        fen: move.fen,
        clocks: this.game.clocks.map((t,i) => i==colorIdx
          ? this.game.clocks[i] + addTime
          : this.game.clocks[i]),
        initime: this.game.initime.map((t,i) => i==nextIdx
          ? Date.now()
          : this.game.initime[i]),
      });
      // Also update current game object:
      this.game.moves.push(move);
      this.game.fen = move.fen;
      //TODO: just this.game.clocks[colorIdx] += addTime;
      this.$set(this.game.clocks, colorIdx, this.game.clocks[colorIdx] + addTime);
      this.game.initime[nextIdx] = Date.now();
    },
    // TODO: this update function should also work for corr games
    gameOver: function(score) {
      this.game.mode = "analyze";
      GameStorage.update(this.gameRef.id, { score: score });
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
