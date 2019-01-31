<template lang="pug">
div
  input#modalNewgame.modal(type="checkbox")
  div(role="dialog" aria-labelledby="titleFenedit")
    .card.smallpad
      label#closeNewgame.modal-close(for="modalNewgame")
      fieldset
        label(for="selectVariant") {{ st.tr["Variant"] }}
        select#selectVariant(v-model="newgameInfo.vid")
          option(v-for="v in st.variants" :value="v.id") {{ v.name }}
      fieldset
        label(for="selectNbPlayers") {{ st.tr["Number of players"] }}
        select#selectNbPlayers(v-model="newgameInfo.nbPlayers")
          option(v-show="possibleNbplayers(2)" value="2") 2
          option(v-show="possibleNbplayers(3)" value="3") 3
          option(v-show="possibleNbplayers(4)" value="4") 4
      fieldset
        label(for="timeControl") Time control (in days)
        #timeControl
          input(type="number" v-model="newgameInfo.mainTime"
            placeholder="Main time")
          input(type="number" v-model="newgameInfo.increment"
            placeholder="Increment")
      fieldset
        label(for="selectPlayers") {{ st.tr["Play with?"] }}
        #selectPlayers
          input(type="text" v-model="newgameInfo.players[0].name")
          input(v-show="newgameInfo.nbPlayers>=3" type="text"
            v-model="newgameInfo.players[1].name")
          input(v-show="newgameInfo.nbPlayers==4" type="text"
            v-model="newgameInfo.players[2].name")
      fieldset
        label(for="inputFen")
          | {{ st.tr["FEN (ignored if players fields are blank)"] }}
        input#inputFen(type="text" v-model="newgameInfo.fen")
      button(@click="newGame") Launch game
      p TODO: cadence, adversaire (pre-filled if click on name)
      p cadence 2m+12s ou 7d+1d (m,s ou d,d) --> main, increment
      p Note: leave FEN blank for random; FEN only for targeted challenge
  div
    ChallengeList(:challenges="challenges" @click-challenge="clickChallenge")
    div(style="border:1px solid black")
      h3 Online players
      div(v-for="p in players" @click="challenge(p)") {{ p.name }}
  button(onClick="doClick('modalNewgame')") New game
  div
    .button-group
      button(@click="gdisplay='live'") Live games
      button(@click="gdisplay='corr'") Correspondance games
    GameList(v-show="gdisplay=='live'" :games="liveGames"
      @show-game="showGame")
    GameList(v-show="gdisplay=='corr'" :games="corrGames"
      @show-game="showGame")
</template>

<script>
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
import { store } from "@/store";
import { NbPlayers } from "@/data/nbPlayers";
import GameList from "@/components/GameList.vue";
import ChallengeList from "@/components/ChallengeList.vue";
export default {
  name: "home",
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
      newgameInfo: {
        fen: "",
        vid: 0,
        nbPlayers: 0,
        players: [{id:0,name:""},{id:0,name:""},{id:0,name:""}],
        mainTime: 0,
        increment: 0,
      },
    };
  },
  watch: {
    "st.conn": function() {
      // TODO: ask server for current corr games (all but mines: names, ID, time control)
      const socketMessageListener = msg => {
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
            // oppid: opponent socket ID (or DB id if registered)
            if (true) //TODO: if challenge is full
              this.newGame(data.challenge, data.user); //user.id et user.name
            break;
          case "withdrawchallenge":
            // TODO
            break;
          case "cancelchallenge":
            // TODO
            break;
          // TODO: distinguish these (dis)connect events from their analogs in game.js
          case "connect":
            this.players.push({name:data.name, id:data.uid});
            break;
          case "disconnect":
            const pIdx = this.players.findIndex(p => p.id == data.uid);
            this.players.splice(pIdx);
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
  },
  methods: {
    showGame: function(game) {
      // NOTE: if we are an observer, the game will be found in main games list
      // (sent by connected remote players)
      this.$router.push("/" + game.id)
    },
    challenge: function(player) {
      this.st.conn.send(JSON.stringify({code:"sendchallenge", oppid:p.id,
        user:{name:this.st.user.name,id:this.st.user.id}}));
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
      // autres actions:
      // supprime mon défi
      // accepte un défi
      // annule l'acceptation d'un défi (si >= 3 joueurs)
      //
      // si pas le mien et FEN speciale :: (charger code variante et)
      // montrer diagramme + couleur (orienté)
    },
    // user: last person to accept the challenge
    newGameLive: function(chall, user) {
      const fen = chall.fen || V.GenRandInitFen();
      const game = {}; //TODO: fen, players, time ...
      //setStorage(game); //TODO
      game.players.forEach(p => {
        this.conn.send(
          JSON.stringify({code:"newgame", oppid:p.id, game:game}));
      });
      if (this.settings.sound >= 1)
        new Audio("/sounds/newgame.mp3").play().catch(err => {});
    },
    newGame: function() {
      const afterRulesAreLoaded = () => {
        // NOTE: side-effect = set FEN
        // TODO: (to avoid any cheating option) separate the GenRandInitFen() functions
        // in separate files, load on server and generate FEN on server.
        const error = checkChallenge(this.newgameInfo, vname);
        if (!!error)
          return alert(error);
        // Possible (server) error if filled player does not exist
        ajax(
          "/challenges/" + this.newgameInfo.vid,
          "POST",
          this.newgameInfo,
          response => {
            const chall = Object.assign({},
              this.newgameInfo,
              {
                id: response.cid,
                uid: user.id,
                added: Date.now(),
                vname: vname,
              });
            this.challenges.push(chall);
          }
        );
        // TODO: else, if live game: send infos (socket), and...
      };
      const idxInVariants =
        variantArray.findIndex(v => v.id == this.newgameInfo.vid);
      const vname = variantArray[idxInVariants].name;
      const scriptId = vname + "RulesScript";
      if (!document.getElementById(scriptId))
      {
        // Load variant rules (only once)
        var script = document.createElement("script");
        script.id = scriptId;
        script.onload = afterRulesAreLoaded;
        //script.addEventListener ("load", afterRulesAreLoaded, false);
        script.src = "/javascripts/variants/" + vname + ".js";
        document.body.appendChild(script);
      }
      else
        afterRulesAreLoaded();
    },
    possibleNbplayers: function(nbp) {
      if (this.newgameInfo.vid == 0)
        return false;
      const variants = this.st.variants;
      const idxInVariants =
        variants.findIndex(v => v.id == this.newgameInfo.vid);
      return NbPlayers[variants[idxInVariants].name].includes(nbp);
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
