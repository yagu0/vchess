<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    BaseGame(:game="game" :vr="vr" ref="basegame"
      @newmove="processMove" @gameover="gameOver")
    .button-group(v-if="game.mode!='analyze'")
      button(@click="offerDraw") Draw
      button(@click="abortGame") Abort
      button(@click="resign") Resign
    div(v-if="game.mode=='corr'")
      textarea(v-show="score=='*' && vr.turn==game.mycolor" v-model="corrMsg")
      div(v-show="cursor>=0") {{ moves[cursor].message }}
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
//import Chat from "@/components/Chat.vue";
//import MoveList from "@/components/MoveList.vue";
import { store } from "@/store";
import { GameStorage } from "@/utils/storage";

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
      vr: null, //"variant rules" object initialized from FEN
      drawOfferSent: false, //did I just ask for draw? (TODO: use for button style)
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
  },
  created: function() {
    if (!!this.$route.params["id"])
    {
      this.gameRef.id = this.$route.params["id"];
      this.gameRef.rid = this.$route.query["rid"];
      this.loadGame();
    }
    // TODO: how to know who is observing ? Send message to everyone with game ID ?
    // and then just listen to (dis)connect events
    // server always send "connect on " + URL ; then add to observers if game...
    // detect multiple tabs connected (when connect ask server if my SID is already in use)
// router when access a game page tell to server I joined + game ID (no need rid)
// and ask server for current joined (= observers)
// when send to chat (or a move), reach only this group (send gid along)
    // --> doivent être enregistrés comme observers au niveau du serveur...
    // non: poll users + events startObserving / stopObserving
    // (à faire au niveau du routeur ?)

    // TODO: also handle "draw accepted" (use opponents array?)
    // --> must give this info also when sending lastState...
    // and, if all players agree then OK draw (end game ...etc)
    const socketMessageListener = msg => {
      const data = JSON.parse(msg.data);
      let L = undefined;
      switch (data.code)
      {
        case "newmove":
          // TODO: observer on dark games must see all board ? Or alternate ? (seems better)
          // ...or just see nothing as on buho21
          // NOTE: next call will trigger processMove()
          this.$refs["basegame"].play(data.move,
            "receive", this.game.vname!="Dark" ? "animate" : null);
          break;
        case "pong": //received if we sent a ping (game still alive on our side)
          if (this.gameRef.id != data.gameId)
            break; //games IDs don't match: the game is definitely over...
          this.oppConnected = true;
          // Send our "last state" informations to opponent(s)
          L = this.vr.moves.length;
          Object.keys(this.opponents).forEach(oid => {
            this.st.conn.send(JSON.stringify({
              code: "lastate",
              oppid: oid,
              gameId: this.gameRef.id,
              lastMove: (L>0?this.vr.moves[L-1]:undefined),
              movesCount: L,
            }));
          });
          break;
        // TODO: refactor this, because at 3 or 4 players we may have missed 2 or 3 moves
        // TODO: need to send along clock state (my current time) with my last move
        case "lastate": //got opponent infos about last move
          L = this.vr.moves.length;
          if (this.gameRef.id != data.gameId)
            break; //games IDs don't match: nothing we can do...
          // OK, opponent still in game (which might be over)
          if (this.score != "*")
          {
            // We finished the game (any result possible)
            this.st.conn.send(JSON.stringify({
              code: "lastate",
              oppid: data.oppid,
              gameId: this.gameRef.id,
              score: this.score,
            }));
          }
          else if (!!data.score) //opponent finished the game
            this.endGame(data.score);
          else if (data.movesCount < L)
          {
            // We must tell last move to opponent
            this.st.conn.send(JSON.stringify({
              code: "lastate",
              oppid: this.opponent.id,
              gameId: this.gameRef.id,
              lastMove: this.vr.moves[L-1],
              movesCount: L,
            }));
          }
          else if (data.movesCount > L) //just got last move from him
            this.play(data.lastMove, "animate"); //TODO: wrong call (3 args)
          break;
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
        // TODO: drawaccepted (click draw button before sending move ==> draw offer in move)
          // ==> on "newmove", check "drawOffer" field
        // TODO: also use (dis)connect info to count online players?
        case "gameconnect":
        case "gamedisconnect":
          if (this.mode=="human")
          {
            const online = (data.code == "connect");
            // If this is an opponent ?
            if (!!this.opponents[data.id])
              this.opponents[data.id].online = online;
            else
            {
              // Or an observer ?
              if (!online)
                delete this.people[data.id];
              else
                this.people[data.id] = data.name;
            }
          }
          break;
      }
    };
    const socketCloseListener = () => {
      this.st.conn.addEventListener('message', socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onmessage = socketMessageListener;
    this.st.conn.onclose = socketCloseListener;
  },
  // dans variant.js (plutôt room.js) conn gère aussi les challenges
  // et les chats dans chat.js. Puis en webRTC, repenser tout ça.
  methods: {
    offerDraw: function() {
      if (!confirm("Offer draw?"))
        return;
      // Stay in "draw offer sent" state until next move is played
      this.drawOfferSent = true;
      if (this.subMode == "corr")
      {
        // TODO: set drawOffer on in game (how ?)
      }
      else //live game
      {
        this.opponents.forEach(o => {
          if (!!o.online)
          {
            try {
              this.st.conn.send(JSON.stringify({code: "draw", oppid: o.id}));
            } catch (INVALID_STATE_ERR) {
              return;
            }
          }
        });
      }
    },
    // + conn handling: "draw" message ==> agree for draw (if we have "drawOffered" at true)
    receiveDrawOffer: function() {
      //if (...)
      // TODO: ignore if preventDrawOffer is set; otherwise show modal box with option "prevent future offers"
      // if accept: send message "draw"
    },
    abortGame: function() {
      if (!confirm("Abort the game?"))
        return;
      
// Abort possible à tout moment avec message
// Sorry I have to go / Game seems over / Game is not interesting

      //+ bouton "abort" avec score == "?" + demander confirmation pour toutes ces actions,
      //send message: "gameOver" avec score "?"
      // ==> BaseGame must listen to game.score change, and call "endgame(score)" in this case
    },
    resign: function(e) {
      if (!confirm("Resign the game?"))
        return;
      this.game.players.forEach(p => {
        if (!!p.sid && p.sid != this.st.user.sid)
        {
          this.st.conn.send(JSON.stringify({
            code: "resign",
            target: p.sid,
          }));
        }
      });
      // Next line will trigger a "gameover" event, bubbling up till here
      this.$refs["basegame"].endGame(this.game.mycolor=="w" ? "0-1" : "1-0");
    },
    // 4 cases for loading a game:
    //  - from localStorage (one running game I play)
    //  - from indexedDB (one completed live game)
    //  - from server (one correspondance game I play[ed] or not)
    //  - from remote peer (one live game I don't play, finished or not)
    loadGame: function() {
      GameStorage.get(this.gameRef, async (game) => {
        this.game = Object.assign({},
          game,
          // NOTE: assign mycolor here, since BaseGame could also bs VS computer
          {mycolor: [undefined,"w","b"][1 + game.players.findIndex(
            p => p.sid == this.st.user.sid)]},
        );
        const vModule = await import("@/variants/" + game.vname + ".js");
        window.V = vModule.VariantRules;
        this.vr = new V(game.fen);
        // Post-processing: decorate each move with current FEN:
        // (to be able to jump to any position quickly)
        game.moves.forEach(move => {
          // NOTE: this is doing manually what BaseGame.play() achieve...
          // but in a lighter "fast-forward" way
          move.color = this.vr.turn;
          this.vr.play(move);
          move.fen = this.vr.getFen();
        });
        this.vr.re_init(game.fen);
      });
//    // Poll all players except me (if I'm playing) to know online status.
//    // --> Send ping to server (answer pong if players[s] are connected)
//    if (this.gameInfo.players.some(p => p.sid == this.st.user.sid))
//    {
//      this.game.players.forEach(p => {
//        if (p.sid != this.st.user.sid)
//          this.st.conn.send(JSON.stringify({code:"ping", oppid:p.sid}));
//      });
//    }
    },
    // TODO: refactor this old "oppConnected" logic
//    oppConnected: function(uid) {
//      return this.opponents.some(o => o.id == uid && o.online);
//    },
    // Post-process a move (which was just played)
    processMove: function(move) {
      if (!this.game.mycolor)
        return; //I'm just an observer
      // Update storage (corr or live)
      const colorIdx = ["w","b","g","r"].indexOf(move.color);
      // https://stackoverflow.com/a/38750895
      const allowed_fields = ["appear", "vanish", "start", "end"];
      const filtered_move = Object.keys(move)
        .filter(key => allowed_fields.includes(key))
        .reduce((obj, key) => {
          obj[key] = move[key];
          return obj;
        }, {});
      // Send move ("newmove" event) to opponent(s) (if ours)
      // (otherwise move.elapsed is supposed to be already transmitted)
      let addTime = undefined;
      if (move.color == this.game.mycolor)
      {
        const elapsed = Date.now() - GameStorage.getInitime();
        this.game.players.forEach(p => {
          if (p.sid != this.st.user.sid)
          {
            this.st.conn.send(JSON.stringify({
              code: "newmove",
              target: p.sid,
              move: Object.assign({}, filtered_move, {elapsed: elapsed}),
            }));
          }
        });
        move.elapsed = elapsed;
        // elapsed time is measured in milliseconds
        addTime = this.game.increment - elapsed/1000;
      }
      GameStorage.update({
        colorIdx: colorIdx,
        move: filtered_move,
        fen: move.fen,
        addTime: addTime,
        initime: (this.vr.turn == this.game.mycolor), //my turn now?
      });
    },
    // TODO: this update function should also work for corr games
    gameOver: function(score) {
      this.game.mode = "analyze";
      GameStorage.update({
        score: score,
      });
    },
  },
};
</script>
