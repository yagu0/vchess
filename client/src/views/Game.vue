<!-- TODO: component Game, + handle players + observers connect/disconnect
  event = "gameconnect" ...etc
  connect/disconnect with sid+name (ID not required); name slightly redundant but easier

quand on arrive dans la partie, on poll les sids pour savoir qui est en ligne (ping)
(éventuel échange lastate avec les connectés, pong ...etc)
ensuite quand qqun se deco il suffit d'écouter "disconnect"
pareil quand quelqu'un reco.
(c'est assez rudimentaire et écoute trop de messages, mais dans un premier temps...)
      // TODO: [in game] send move + elapsed time (in milliseconds); in case of "lastate" message too
-->
<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    //BaseGame(:variant="variant.name" @game-over=".....TODO")
    //localStorage["score"] = score;


    .button-group(v-if="mode!='analyze'")
      button(@click="offerDraw") Draw
      button(@click="abortGame") Abort
      button(@click="resign") Resign
    div(v-if="mode=='corr'")
      textarea(v-show="score=='*' && vr.turn==mycolor" v-model="corrMsg")
      div(v-show="cursor>=0") {{ moves[cursor].message }}
</template>

<script>
// TODO: if I'm an observer and player(s) disconnect/reconnect, how to find me ?
//      onClick :: ask full game to remote player, and register as an observer in game
//      (use gameId to communicate)
//      on landing on game :: if gameId not found locally, check remotely
//      ==> il manque un param dans game : "remoteId"
import Board from "@/components/Board.vue";
//import Chat from "@/components/Chat.vue";
//import MoveList from "@/components/MoveList.vue";
import { store } from "@/store";

export default {
  name: 'my-game',
  components: {
    BaseGame,
  },
  // gameId: to find the game in storage (assumption: it exists)
  // mode: "live" or "corr" (correspondance game), or "analyze"
  // gameRef in URL hash (listen for changes)
  props: ["gid","mode","variant"],
  data: function() {
    return {
      st: store.state,
      myname: store.state.user.name, //may be anonymous (thus no name)
      opponents: {}, //filled later (potentially 2 or 3 opponents)
      drawOfferSent: false, //did I just ask for draw?
      people: [], //observers
    };
  },
  watch: {
    gid: function() {
      this.launchGame();
    },
  },
  // Modal end of game, and then sub-components
  created: function() {
    if (!!this.gid)
      this.launchGame();
    // TODO: if I'm one of the players in game, then:
    // Send ping to server (answer pong if opponent[s] is connected)
    if (true && !!this.conn && !!this.gameRef)
    {
      this.conn.onopen = () => {
        this.conn.send(JSON.stringify({
          code:"ping",oppid:this.oppid,gameId:this.gameRef.id}));
      };
    }
    // TODO: also handle "draw accepted" (use opponents array?)
    // --> must give this info also when sending lastState...
    // and, if all players agree then OK draw (end game ...etc)
    const socketMessageListener = msg => {
      const data = JSON.parse(msg.data);
      let L = undefined;
      switch (data.code)
      {
        case "newmove": //..he played!
          this.play(data.move, this.variant.name!="Dark" ? "animate" : null);
          break;
        case "pong": //received if we sent a ping (game still alive on our side)
          if (this.gameRef.id != data.gameId)
            break; //games IDs don't match: definitely over...
          this.oppConnected = true;
          // Send our "last state" informations to opponent(s)
          L = this.vr.moves.length;
          Object.keys(this.opponents).forEach(oid => {
            this.conn.send(JSON.stringify({
              code: "lastate",
              oppid: oid,
              gameId: this.gameRef.id,
              lastMove: (L>0?this.vr.moves[L-1]:undefined),
              movesCount: L,
            }));
          });
          break;
        // TODO: refactor this, because at 3 or 4 players we may have missed 2 or 3 moves (not just one)
        case "lastate": //got opponent infos about last move
          L = this.vr.moves.length;
          if (this.gameRef.id != data.gameId)
            break; //games IDs don't match: nothing we can do...
          // OK, opponent still in game (which might be over)
          if (this.score != "*")
          {
            // We finished the game (any result possible)
            this.conn.send(JSON.stringify({
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
            this.conn.send(JSON.stringify({
              code: "lastate",
              oppid: this.opponent.id,
              gameId: this.gameRef.id,
              lastMove: this.vr.moves[L-1],
              movesCount: L,
            }));
          }
          else if (data.movesCount > L) //just got last move from him
            this.play(data.lastMove, "animate");
          break;
        case "resign": //..you won!
          this.endGame(this.mycolor=="w"?"1-0":"0-1");
          break;
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
      this.conn.addEventListener('message', socketMessageListener);
      this.conn.addEventListener('close', socketCloseListener);
    };
    if (!!this.conn)
    {
      this.conn.onmessage = socketMessageListener;
      this.conn.onclose = socketCloseListener;
    }
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
              this.conn.send(JSON.stringify({code: "draw", oppid: o.id}));
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
      //+ bouton "abort" avec score == "?" + demander confirmation pour toutes ces actions,
      //send message: "gameOver" avec score "?"
    },
    resign: function(e) {
      if (!confirm("Resign the game?"))
        return;
      if (this.mode == "human" && this.oppConnected(this.oppid))
      {
        try {
          this.conn.send(JSON.stringify({code: "resign", oppid: this.oppid}));
        } catch (INVALID_STATE_ERR) {
          return;
        }
      }
      this.endGame(this.mycolor=="w"?"0-1":"1-0");
    },
    launchGame: async function() {
      const vModule = await import("@/variants/" + this.variant.name + ".js");
      window.V = vModule.VariantRules;
      this.loadGame(this.gid);
    },
    loadGame: function(gid) {
      // TODO: ask game to remote peer if this.remoteId is set
      // (or just if game not found locally)
      // NOTE: if it's a corr game, ask it from server
      const game = getGameFromStorage(gid); //, this.gameRef.uid); //uid may be blank
      this.opponent.id = game.oppid; //opponent ID in case of running HH game
      this.opponent.name = game.oppname; //maye be blank (if anonymous)
      this.score = game.score;
      this.mycolor = game.mycolor;
      this.fenStart = game.fenStart;
      this.moves = game.moves;
      this.cursor = game.moves.length-1;
      this.lastMove = (game.moves.length > 0 ? game.moves[this.cursor] : null);
    },
    oppConnected: function(uid) {
      return this.opponents.any(o => o.id == uidi && o.online);
    },
  },
};
</script>
