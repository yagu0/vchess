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
    div Names: {{ game.players[0].name }} - {{ game.players[1].name }}
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
// when send to chat (or a move), reach only this group (send gid along)
-->

<script>
import BaseGame from "@/components/BaseGame.vue";
//import Chat from "@/components/Chat.vue";
//import MoveList from "@/components/MoveList.vue";
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ppt } from "@/utils/datetime";
import { extractTime } from "@/utils/timeControl";
import { ArrayFun } from "@/utils/array";

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
      game: {players:[{name:""},{name:""}]}, //passed to BaseGame
      corrMsg: "", //to send offline messages in corr games
      virtualClocks: [0, 0], //initialized with true game.clocks
      vr: null, //"variant rules" object initialized from FEN
      drawOffer: "", //TODO: use for button style
      people: [], //players + observers
    };
  },
  watch: {
    "$route": function(to, from) {
      this.gameRef.id = to.params["id"];
      this.gameRef.rid = to.query["rid"];
      this.loadGame();
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
        if (countdown <= 0 || this.vr.turn != currentTurn || this.game.score != "*")
        {
          clearInterval(clockUpdate);
          if (countdown <= 0 && myTurn)
          {
            this.$refs["basegame"].endGame(
              this.game.mycolor=="w" ? "0-1" : "1-0", "Time");
            const oppsid = this.getOppSid();
            if (!!oppsid)
            {
              this.st.conn.send(JSON.stringify({
                code: "timeover",
                target: oppsid,
              }));
            }
          }
        }
        else
        {
          // TODO: with Vue 3, just do this.virtualClocks[colorIdx] = ppt(--countdown)
          this.$set(this.virtualClocks, colorIdx, ppt(Math.max(0, --countdown)));
        }
      }, 1000);
    },
  },
  // TODO: redundant code with Hall.vue (related to people array)
  created: function() {
    // Always add myself to players' list
    const my = this.st.user;
    this.people.push({sid:my.sid, id:my.id, name:my.name});
    if (!!this.$route.params["id"])
    {
      this.gameRef.id = this.$route.params["id"];
      this.gameRef.rid = this.$route.query["rid"];
      this.loadGame();
    }
    // 0.1] Ask server for room composition:
    const funcPollClients = () => {
      this.st.conn.send(JSON.stringify({code:"pollclients"}));
    };
    if (!!this.st.conn && this.st.conn.readyState == 1) //1 == OPEN state
      funcPollClients();
    else //socket not ready yet (initial loading)
      this.st.conn.onopen = funcPollClients;
    this.st.conn.onmessage = this.socketMessageListener;
    const socketCloseListener = () => {
      store.socketCloseListener(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', this.socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onclose = socketCloseListener;
  },
  methods: {
    getOppSid: function() {
      if (!!this.game.oppsid)
        return this.game.oppsid;
      const opponent = this.people.find(p => p.id == this.game.oppid);
      return (!!opponent ? opponent.sid : null);
    },
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        // 0.2] Receive clients list (just socket IDs)
        case "pollclients":
        {
          data.sockIds.forEach(sid => {
            this.people.push({sid:sid, id:0, name:""});
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
            this.st.conn.send(JSON.stringify(
              // people[0] instead of st.user to avoid sending email
              {code:"identity", user:this.people[0], target:data.from}));
          }
          break;
        }
        case "identity":
        {
          let player = this.people.find(p => p.sid == data.user.sid);
          player.id = data.user.id;
          player.name = data.user.name;
          // Sending last state only for live games: corr games are complete
          if (this.game.type == "live" && this.game.oppsid == player.sid)
          {
            // Send our "last state" informations to opponent
            const L = this.game.moves.length;
            this.st.conn.send(JSON.stringify({
              code: "lastate",
              target: player.sid,
              state:
              {
                lastMove: (L>0 ? this.game.moves[L-1] : undefined),
                score: this.game.score,
                movesCount: L,
                drawOffer: this.drawOffer,
                clocks: this.game.clocks,
              }
            }));
          }
          break;
        }
        case "newmove":
          // NOTE: this call to play() will trigger processMove()
          this.$refs["basegame"].play(data.move,
            "receive", this.game.vname!="Dark" ? "animate" : null);
          break;
        case "lastate": //got opponent infos about last move
        {
          const L = this.game.moves.length;
          if (data.movesCount > L)
          {
            // Just got last move from him
            this.$refs["basegame"].play(data.lastMove,
              "receive", this.game.vname!="Dark" ? "animate" : null);
            if (data.score != "*" && this.game.score == "*")
            {
              // Opponent resigned or aborted game, or accepted draw offer
              // (this is not a stalemate or checkmate)
              this.$refs["basegame"].endGame(data.score, "Opponent action");
            }
            this.game.clocks = data.clocks; //TODO: check this?
            this.drawOffer = data.drawOffer; //does opponent offer draw?
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
          // ==> mark request SID as someone to send moves to
          // NOT to all people array: our opponent can send moves too!
          break;
        case "fullgame":
          // and when receiving answer just call loadGame(received_game)
          this.loadGame(data.game);
          break;
        // TODO: drawaccepted (click draw button before sending move
        // ==> draw offer in move)
        // ==> on "newmove", check "drawOffer" field
        case "connect":
        {
          this.people.push({name:"", id:0, sid:data.sid});
          this.st.conn.send(JSON.stringify({code:"askidentity", target:data.sid}));
          break;
        }
        case "disconnect":
          ArrayFun.remove(this.people, p => p.sid == data.sid);
          break;
      }
    },
    offerDraw: function() {
      // TODO: also for corr games
      if (this.drawOffer == "received")
      {
        if (!confirm("Accept draw?"))
          return;
        const oppsid = this.getOppSid();
        if (!!oppsid)
          this.st.conn.send(JSON.stringify({code:"draw", target:oppsid}));
        this.$refs["basegame"].endGame("1/2", "Mutual agreement");
      }
      else if (this.drawOffer == "sent")
        this.drawOffer = "";
      else
      {
        if (!confirm("Offer draw?"))
          return;
        const oppsid = this.getOppSid();
        if (!!oppsid)
          this.st.conn.send(JSON.stringify({code:"drawoffer", target:oppsid}));
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
        const oppsid = this.getOppSid();
        if (!!oppsid)
        {
          this.st.conn.send(JSON.stringify({
            code: "abort",
            msg: message,
            target: oppsid,
          }));
        }
      }
    },
    resign: function(e) {
      if (!confirm("Resign the game?"))
        return;
      const oppsid = this.getOppSid();
      if (!!oppsid)
      {
        this.st.conn.send(JSON.stringify({
          code: "resign",
          target: oppsid,
        }));
      }
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
          game.clocks = [tc.mainTime, tc.mainTime];
          game.initime = [0, 0];
          const L = game.moves.length;
          game.moves.sort((m1,m2) => m1.idx - m2.idx); //in case of
          if (L >= 3)
          {
            let addTime = [0, 0];
            for (let i=2; i<L; i++)
            {
              addTime[i%2] += tc.increment -
                (game.moves[i].played - game.moves[i-1].played);
            }
            for (let i=0; i<=1; i++)
              game.clocks[i] += addTime[i];
          }
          if (L >= 1)
            game.initime[L%2] = game.moves[L-1].played;
          // Now that we used idx and played, re-format moves as for live games
          game.moves = game.moves.map(m => {
            const s = m.squares;
            return
            {
              appear: s.appear,
              vanish: s.vanish,
              start: s.start,
              end: s.end,
              message: m.message,
            };
          });
        }
        const myIdx = game.players.findIndex(p => {
          return p.sid == this.st.user.sid || p.uid == this.st.user.id;
        });
        if (gtype == "live" && game.clocks[0] < 0) //game unstarted
        {
          game.clocks = [tc.mainTime, tc.mainTime];
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
      };
      if (!!game)
        return afterRetrival(game);
      if (!!this.gameRef.rid)
      {
        // Remote live game
        this.st.conn.send(JSON.stringify(
          {code:"askfullgame", target:this.gameRef.rid}));
        // (send moves updates + resign/abort/draw actions)
      }
      else
      {
        // Local or corr game
        GameStorage.get(this.gameRef.id, (game) => {
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
        fen: move.fen,
        move:
        {
          squares: filtered_move,
          message: this.corrMsg, //TODO
          played: Date.now(), //TODO: on server?
          idx: this.game.moves.length,
        },
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
      this.game.score = score;
      GameStorage.update(this.gameRef.id, { score: score });
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
