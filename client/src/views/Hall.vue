<template lang="pug">
main
  input#modalNewgame.modal(type="checkbox")
  div(role="dialog" aria-labelledby="titleFenedit")
    .card.smallpad
      label#closeNewgame.modal-close(for="modalNewgame")
      fieldset
        label(for="selectVariant") {{ st.tr["Variant"] }}
        select#selectVariant(v-model="newchallenge.vid")
          option(v-for="v in st.variants" :value="v.id") {{ v.name }}
      fieldset
        label(for="selectNbPlayers") {{ st.tr["Number of players"] }}
        select#selectNbPlayers(v-model="newchallenge.nbPlayers")
          option(v-show="possibleNbplayers(2)" value="2") 2
          option(v-show="possibleNbplayers(3)" value="3") 3
          option(v-show="possibleNbplayers(4)" value="4") 4
      fieldset
        label(for="timeControl") Time control (e.g. 3m, 1h+30s, 7d+1d)
        input#timeControl(type="text" v-model="newchallenge.timeControl"
          placeholder="Time control")
      fieldset
        label(for="selectPlayers") {{ st.tr["Play with? (optional)"] }}
        #selectPlayers
          input(type="text" v-model="newchallenge.players[0].name")
          input(v-show="newchallenge.nbPlayers>=3" type="text"
            v-model="newchallenge.players[1].name")
          input(v-show="newchallenge.nbPlayers==4" type="text"
            v-model="newchallenge.players[2].name")
      fieldset
        label(for="inputFen") {{ st.tr["FEN (optional)"] }}
        input#inputFen(type="text" v-model="newchallenge.fen")
      button(@click="newChallenge") Send challenge
  .row
    .col-sm-12.col-md-5.col-md-offset-1.col-lg-4.col-lg-offset-2
      ChallengeList(:challenges="challenges" @click-challenge="clickChallenge")
    .col-sm-12.col-md-5.col-lg-4
      #players
        h3 Online players
        div(v-for="p in players" @click="challenge(p)") {{ p.name }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      button(onClick="doClick('modalNewgame')") New game
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button(@click="gdisplay='live'") Live games
        button(@click="gdisplay='corr'") Correspondance games
      GameList(v-show="gdisplay=='live'" :games="liveGames"
        @show-game="showGame")
      GameList(v-show="gdisplay=='corr'" :games="corrGames"
        @show-game="showGame")
</template>

<script>
// TODO: blank time control == untimed
// main playing hall: online players + current challenges + button "new game"
// TODO: si on est en train de jouer une partie, le notifier aux nouveaux connectés
/*
TODO: surligner si nouveau défi perso et pas affichage courant
(cadences base + incrément, corr == incr >= 1jour ou base >= 7j)
--> correspondance: stocker sur serveur lastMove + uid + color + movesCount + gameId + variant + timeleft
fin de partie corr: supprimer partie du serveur au bout de 7 jours (arbitraire)
*/
// TODO: au moins l'échange des coups en P2P ? et game chat ?
// TODO: objet game, objet challenge ? et player ?
/*
 * Possible events:
 *  - send new challenge (corr or live, cf. time control), with button or click on player
 *  - accept challenge (corr or live) --> send info to all concerned players
 *  - cancel challenge (click on sent challenge) --> send info to all concerned players
 *  - withdraw from challenge (if >= 3 players and previously accepted)
 *    --> send info to all concerned players
 *  - prepare and start new game (if challenge is full after acceptation)
 *    Also send to all connected players (only from me)
 *  - receive "player connect": send all our current challenges (to him or global)
 *    Also send all our games (live - max 1 - and corr) [in web worker ?]
 *    + all our sent challenges.
 *  - receive "playergames": list of games by some connected player (NO corr)
 *  - receive "playerchallenges": list of challenges (sent) by some online player (NO corr)
 *  - receive "player disconnect": remove from players list
 *  - receive "accept/withdraw/cancel challenge": apply action to challenges list
 *  - receive "new game": if live, store locally + redirect to game
 *    If corr: notify "new game has started", give link, but do not redirect
*/
import { store } from "@/store";
import { NbPlayers } from "@/data/nbPlayers";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import GameList from "@/components/GameList.vue";
import ChallengeList from "@/components/ChallengeList.vue";
export default {
  name: "my-hall",
  components: {
    GameList,
    ChallengeList,
  },
  data: function () {
    return {
      st: store.state,
      gdisplay: "live",
      liveGames: [],
      corrGames: [],
      players: [], //online players
      challenges: [], //live challenges
      willPlay: [], //IDs of challenges in which I decide to play (>= 3 players)
      newchallenge: {
        fen: "",
        vid: 0,
        nbPlayers: 0,
        // TODO: distinguer uid et sid !
        players: [{id:0,name:""},{id:0,name:""},{id:0,name:""}],
        timeControl: "",
      },
    };
  },
  watch: {
    "st.conn": function() {
      this.st.conn.onmessage = this.socketMessageListener;
      this.st.conn.onclose = this.socketCloseListener;
    },
  },
  created: function() {
    // TODO: ask server for current corr games (all but mines: names, ID, time control)
    if (!!this.st.conn)
    {
      this.st.conn.onmessage = this.socketMessageListener;
      this.st.conn.onclose = this.socketCloseListener;
    }
  },
  methods: {
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        case "newgame":
          // TODO: new game just started: data contain all informations
          // (id, players, time control, fenStart ...)
          break;
        // TODO: also receive live games summaries (update)
        // (just players names, time control, and ID + player ID)
        case "acceptchallenge":
          if (true) //TODO: if challenge is full
            this.newGame(data.challenge, data.user); //user.id et user.name
          break;
        case "withdrawchallenge":
          const cIdx = this.challenges.findIndex(c => c.id == data.cid);
          let chall = this.challenges[cIdx]
          ArrayFun.remove(chall.players, p => p.id == data.uid);
          chall.players.push({id:0, name:""});
          break;
        case "cancelchallenge":
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          break;
        case "hallconnect":
          this.players.push({name:data.name, id:data.uid});
          break;
        case "halldisconnect":
          ArrayFun.remove(this.players, p => p.id == data.uid);
          break;
      }
    },
    socketCloseListener: function() {
      this.st.conn.addEventListener('message', socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    },
    clickPlayer: function() {
      //this.newgameInfo.players[0].name = clickPlayer.name;
      //show modal;
    },
    showGame: function(game) {
      // NOTE: if we are an observer, the game will be found in main games list
      // (sent by connected remote players)
      this.$router.push("/" + game.id)
    },
    challenge: function(player) {
    },
    clickChallenge: function(challenge) {
      const index = this.challenges.findIndex(c => c.id == challenge.id);
      const toIdx = challenge.to.findIndex(p => p.id == user.id);
      const me = {name:user.name,id:user.id};
      if (toIdx >= 0)
      {
        // It's a multiplayer challenge I accepted: withdraw
        this.st.conn.send(JSON.stringify({code:"withdrawchallenge",
          cid:challenge.id, user:me}));
        this.challenges.to.splice(toIdx, 1);
      }
      else if (challenge.from.id == user.id) //it's my challenge: cancel it
      {
        this.st.conn.send(JSON.stringify({code:"cancelchallenge", cid:challenge.id}));
        this.challenges.splice(index, 1);
      }
      else //accept a challenge
      {
        this.st.conn.send(JSON.stringify({code:"acceptchallenge",
          cid:challenge.id, user:me}));
        this.challenges[index].to.push(me);
      }
      // TODO: accepter un challenge peut lancer une partie, il
      // faut alors supprimer challenge + creer partie + la retourner et l'ajouter ici
      // si pas le mien et FEN speciale :: (charger code variante et)
      // montrer diagramme + couleur (orienté)
    },
    // user: last person to accept the challenge
    newGame: function(chall, user) {
      const fen = chall.fen || V.GenRandInitFen();
      const game = {}; //TODO: fen, players, time ...
      //setStorage(game); //TODO
      game.players.forEach(p => { //...even if game is by corr (could be played live, why not...)
        this.conn.send(
          JSON.stringify({code:"newgame", oppid:p.id, game:game}));
      });
      if (this.settings.sound >= 1)
        new Audio("/sounds/newgame.mp3").play().catch(err => {});
    },
    newChallenge: async function() {
      const idxInVariants =
        this.st.variants.findIndex(v => v.id == this.newchallenge.vid);
      const vname = variants[idxInVariants].name;
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      // NOTE: side-effect = set FEN, and mainTime + increment in seconds
      // TODO: (to limit cheating options) separate the GenRandInitFen() functions
      // in separate files, load on server and generate FEN on server.
      const error = checkChallenge(this.newchallenge);
      if (!!error)
        return alert(error);
      // TODO: 40 = average number of moves ?
      if (this.newchallenge.mainTime + 40 * this.newchallenge.increment
        >= 3*24*60*60) //3 days (TODO: heuristic...)
      {
        // Correspondance game:
        // Possible (server) error if filled player does not exist
        ajax(
          "/challenges/" + this.newchallenge.vid,
          "POST",
          this.newchallenge,
          response => {
            const chall = Object.assign({},
              this.newchallenge,
              {
                id: response.cid,
                uid: this.st.user.id,
                added: Date.now(),
                vname: vname,
              });
            this.challenges.push(chall);
            document.getElementById("modalNewgame").checked = false;
          }
        );
      }
      else
      {
        // Considered live game
        if (this.newchallenges.players[0].id > 0)
        {
          // Challenge with target players
          this.newchallenges.players.forEach(p => {
            this.st.conn.send(JSON.stringify({
              code: "sendchallenge",
              oppid: p.id,
              user: {name:this.st.user.name, id:this.st.user.id}
            }));
          });
        }
        else
        {
          // Open challenge: send to all connected players
          // TODO
        }
      }
    },
    possibleNbplayers: function(nbp) {
      if (this.newchallenge.vid == 0)
        return false;
      const variants = this.st.variants;
      const idxInVariants =
        variants.findIndex(v => v.id == this.newchallenge.vid);
      return NbPlayers[variants[idxInVariants].name].includes(nbp);
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
