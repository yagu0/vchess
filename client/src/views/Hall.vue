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
          option(v-show="possibleNbplayers(2)" value="2" selected) 2
          option(v-show="possibleNbplayers(3)" value="3") 3
          option(v-show="possibleNbplayers(4)" value="4") 4
      fieldset
        label(for="timeControl") {{ st.tr["Time control"] }}
        input#timeControl(type="text" v-model="newchallenge.timeControl"
          placeholder="3m+2s, 1h+30s, 7d+1d ...")
      fieldset(v-if="st.user.id > 0")
        label(for="selectPlayers") {{ st.tr["Play with? (optional)"] }}
        #selectPlayers
          input(type="text" v-model="newchallenge.to[0]")
          input(v-show="newchallenge.nbPlayers>=3" type="text"
            v-model="newchallenge.to[1]")
          input(v-show="newchallenge.nbPlayers==4" type="text"
            v-model="newchallenge.to[2]")
      fieldset(v-if="st.user.id > 0")
        label(for="inputFen") {{ st.tr["FEN (optional)"] }}
        input#inputFen(type="text" v-model="newchallenge.fen")
      button(@click="newChallenge") {{ st.tr["Send challenge"] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      button(onClick="doClick('modalNewgame')") New game
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .collapse
        input#challengeSection(type="radio" checked aria-hidden="true" name="accordion")
        label(for="challengeSection" aria-hidden="true") Challenges
        div
          .button-group
            button(@click="cdisplay='live'") Live Challenges
            button(@click="cdisplay='corr'") Correspondance challenges
          ChallengeList(v-show="cdisplay=='live'"
            :challenges="filterChallenges('live')" @click-challenge="clickChallenge")
          ChallengeList(v-show="cdisplay=='corr'"
            :challenges="filterChallenges('corr')" @click-challenge="clickChallenge")
        input#peopleSection(type="radio" aria-hidden="true" name="accordion")
        label(for="peopleSection" aria-hidden="true") People
        div
          .button-group
            button(@click="pdisplay='players'") Players
            button(@click="pdisplay='chat'") Chat
          #players(v-show="pdisplay=='players'")
            h3 Online players
            .player(v-for="p in uniquePlayers" @click="tryChallenge(p)"
              :class="{anonymous: !!p.count}"
            )
              | {{ p.name + (!!p.count ? " ("+p.count+")" : "") }}
          #chat(v-show="pdisplay=='chat'")
            h3 Chat (TODO)
        input#gameSection(type="radio" aria-hidden="true" name="accordion")
        label(for="gameSection" aria-hidden="true") Games
        div
          .button-group
            button(@click="gdisplay='live'") Live games
            button(@click="gdisplay='corr'") Correspondance games
          GameList(v-show="gdisplay=='live'" :games="filterGames('live')"
            @show-game="showGame")
          GameList(v-show="gdisplay=='corr'" :games="filterGames('corr')"
            @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { NbPlayers } from "@/data/nbPlayers";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import { ajax } from "@/utils/ajax";
import { getRandString } from "@/utils/alea";
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
      cdisplay: "live", //or corr
      pdisplay: "players", //or chat
      gdisplay: "live",
      games: [],
      challenges: [],
      players: [], //online players (rename into "people" ?)
      newchallenge: {
        fen: "",
        vid: 0,
        nbPlayers: 0,
        to: ["", "", ""], //name of challenged players
        timeControl: "", //"2m+2s" ...etc
      },
    };
  },
  computed: {
    uniquePlayers: function() {
      // Show e.g. "@nonymous (5)", and do nothing on click on anonymous
      let anonymous = {id:0, name:"@nonymous", count:0};
      let playerList = [];
      this.players.forEach(p => {
        if (p.id > 0)
          playerList.push(p);
        else
          anonymous.count++;
      });
      if (anonymous.count > 0)
        playerList.push(anonymous);
      return playerList;
    },
  },
  created: function() {
    // Always add myself to players' list
    this.players.push(this.st.user);
    // Ask server for current corr games (all but mines)
//    ajax(
//      "",
//      "GET",
//      response => {
//
//      }
//    );
//    // Also ask for corr challenges (all)
//    ajax(
//      "",
//      "GET",
//      response => {
//
//      }
//    );
    // 0.1] Ask server for for room composition:
    const socketOpenListener = () => {
      this.st.conn.send(JSON.stringify({code:"pollclients"}));
    };
    this.st.conn.onopen = socketOpenListener;
    // TODO: is this required here?
    this.oldOnmessage = this.st.conn.onmessage || Function.prototype;
    this.st.conn.onmessage = this.socketMessageListener;
    const oldOnclose = this.st.conn.onclose;
    const socketCloseListener = () => {
      oldOnclose(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', this.socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onclose = socketCloseListener;
  },
  methods: {
    filterChallenges: function(type) {
      return this.challenges.filter(c => c.type == type);
    },
    filterGames: function(type) {
      return this.games.filter(c => c.type == type);
    },
    classifyChallenge: function(c) {
      // Heuristic: should work for most cases... (TODO)
      return (c.timeControl.indexOf('d') === -1 ? "live" : "corr");
    },
    socketMessageListener: function(msg) {
      // Save and call current st.conn.onmessage if one was already defined
      // --> also needed in future Game.vue (also in Chat.vue component)
      this.oldOnmessage(msg);
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        // 0.2] Receive clients list (just socket IDs)
        case "pollclients":
        {
          data.sockIds.forEach(sid => {
            this.players.push({sid:sid, id:0, name:""});
            // Ask identity, challenges and game(s)
            this.st.conn.send(JSON.stringify({code:"askidentity", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askchallenges", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askgame", target:sid}));
          });
          break;
        }
        case "askidentity":
        {
          // Request for identification: reply if I'm not anonymous
          if (this.st.user.id > 0)
          {
            this.st.conn.send(JSON.stringify(
              {code:"identity", user:this.st.user, target:data.from}));
          }
          break;
        }
        case "askchallenge":
        {
          // Send my current live challenge (if any)
          const cIdx = this.challenges
            .findIndex(c => c.from.sid == this.st.user.sid && c.type == "live");
          if (cIdx >= 0)
          {
            const c = this.challenges[cIdx];
            const myChallenge =
            {
              // Minimal challenge informations: (from not required)
              to: c.to,
              fen: c.fen,
              vid: c.vid,
              timeControl: c.timeControl
            };
            this.st.conn.send(JSON.stringify({code:"challenge",
              challenge:myChallenge, target:data.from}));
          }
          break;
        }
        case "askgame":
        {
          // TODO: Send my current live game (if any): variant, players, movesCount
          break;
        }
        case "identity":
        {
          const pIdx = this.players.findIndex(p => p.sid == data.user.sid);
          this.players[pIdx].id = data.user.id;
          this.players[pIdx].name = data.user.name;
          break;
        }
        case "challenge":
        {
          // Receive challenge from some player (+sid)
          let newChall = data.chall;
          newChall.type = classifyChallenge(data.chall);
          const pIdx = this.players.findIndex(p => p.sid == data.sid);
          newChall.from = this.players[pIdx]; //may be anonymous
          newChall.added = Date.now();
          this.challenges.push(newChall);
          break;
        }
        case "game":
        {
          // Receive game from some player (+sid)
          // TODO: receive game summary (update, count moves)
          // (just players names, time control, and ID + player ID)
          // NOTE: it may be correspondance (if newgame while we are connected)
          break;
        }
// *  - receive "new game": if live, store locally + redirect to game
// *    If corr: notify "new game has started", give link, but do not redirect
        case "newgame":
        {
          // TODO: new game just started: data contain all informations
          // (id, players, time control, fenStart ...)
          // + cid to remove challenge from list
          break;
        }
// *  - receive "accept/withdraw/cancel challenge": apply action to challenges list
        case "acceptchallenge":
        {
          // Someone accept an open (or targeted) challenge,
          // of 3 or more players and empty slots remain.
          const cIdx = this.challenges.findIndex(c => c.id == data.cid);
          let players = this.challenges[cIdx].to;
          const pIdx = this.players.fndIndex(p => p.sid == data.from);
          for (let i=0; i<players.length; i++)
          {
            if (!players[i])
            {
              players[i] = this.players[pIdx].name;
              break;
            }
          }
          break;
        }
        case "withdrawchallenge":
        {
          const cIdx = this.challenges.findIndex(c => c.id == data.cid);
          let chall = this.challenges[cIdx]
          ArrayFun.remove(chall.players, p => p.id == data.uid);
          chall.players.push({id:0, name:""});
          break;
        }
        case "deletechallenge":
        {
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          break;
        }
        // TODO: distinguish hallConnect and gameConnect ?
        // Or global variable players
        // + game variable: "observers"
        case "connect":
// *  - receive "player connect": send our current challenge (to him or global)
// *    Also send all our games (live - max 1 - and corr) [in web worker ?]
        {
          this.players.push({name:"", id:0, sid:data.sid});
          this.st.conn.send(JSON.stringify({code:"askidentity", target:data.sid}));
          break;
        }
// *  - receive "player disconnect": remove from players list
        case "disconnect":
        {
          ArrayFun.remove(this.players, p => p.sid == data.sid);
          // TODO: also remove all challenges sent by this player,
          // and all live games where he plays and no other opponent is online
          break;
        }
      }
    },
    showGame: function(game) {
      // NOTE: if we are an observer, the game will be found in main games list
      // (sent by connected remote players)
      // TODO: game path ? /vname/gameId seems better
      this.$router.push("/" + game.id);
    },
    tryChallenge: function(player) {
      if (player.id == 0)
        return; //anonymous players cannot be challenged
      this.newchallenge.to[0] = player.name;
      doClick("modalNewgame");
    },
// *  - accept challenge (corr or live) --> send info to all concerned players
// *  - cancel challenge (click on sent challenge) --> send info to all concerned players
// *  - withdraw from challenge (if >= 3 players and previously accepted)
// *    --> send info to all concerned players
// *  - refuse challenge (or receive refusal): send to all challenge players (from + to)
// *    except us ; graphics: modal again ? (inline ?)
// *  - prepare and start new game (if challenge is full after acceptation)
// *    --> include challenge ID (so that opponents can delete the challenge too)
// *    Also send to all connected players (only from me)
    clickChallenge: function(challenge) {
      // TODO: also correspondance case (send to server)
      const index = this.challenges.findIndex(c => c.id == challenge.id);
      const toIdx = challenge.to.findIndex(name => name == this.st.user.name);
      if (toIdx >= 0)
      {
        // It's a multiplayer challenge I accepted: withdraw
        this.st.conn.send(JSON.stringify({code:"withdrawchallenge",
          cid:challenge.id, user:this.st.user.sid}));
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
      //this.newGame(data.challenge, data.user); //user.id et user.name
    },
    // user: last person to accept the challenge (TODO: revoir ça)
//    newGame: function(chall, user) {
//      const fen = chall.fen || V.GenRandInitFen();
//      const game = {}; //TODO: fen, players, time ...
//      //setStorage(game); //TODO
//      game.players.forEach(p => { //...even if game is by corr (could be played live, why not...)
//        this.conn.send(
//          JSON.stringify({code:"newgame", oppid:p.id, game:game}));
//      });
//      if (this.settings.sound >= 1)
//        new Audio("/sounds/newgame.mp3").play().catch(err => {});
//    },
    // Send new challenge (corr or live, cf. time control), with button or click on player
    newChallenge: async function() {
      // TODO: put this "load variant" block elsewhere
      const vIdx = this.st.variants.findIndex(v => v.id == this.newchallenge.vid);
      const vname = this.st.variants[vIdx].name;
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      const error = checkChallenge(this.newchallenge);
      if (!!error)
        return alert(error);
      const ctype = this.classifyChallenge(this.newchallenge);
      const cto = this.newchallenge.to.slice(0, this.newchallenge.nbPlayers);
      let chall =
      {
        fen: this.newchallenge.fen || V.GenRandInitFen(),
        to: cto,
        timeControl: this.newchallenge.timeControl,
        from: this.st.user.sid,
        vid: this.newchallenge.vid,
      };
      const sendSomethingTo = (to, code, obj) => {
        const doSend = (code, obj, sid) => {
          this.st.conn.send(JSON.stringify(Object.assign(
            {},
            {code: code},
            obj,
            {target: sid}
          )));
        };
        const getSid = (pname) => {
          const pIdx = this.players.findIndex(pl => pl.name == pname);
          if (ctype == "live" && pIdx === -1)
            alert("Warning: " + p.name + " is not connected");
          return this.players[pIdx].sid;
        };
        if (!!to[0])
        {
          // Challenge with targeted players
          to.forEach(pname => { doSend(code, obj, getSid(pname)); });
        }
        else
        {
          // Open challenge: send to all connected players (except us)
          this.players.forEach(p => {
            if (p.sid != this.st.user.sid) //only sid is always set
              doSend(code, obj, p.sid);
          });
        }
      };
      const finishAddChallenge = (cid) => {
        chall.id = cid || "c" + getRandString();
        // Send challenge to peers
        sendSomethingTo(cto, "challenge", chall);
        chall.added = Date.now();
        this.challenges.push(chall);
        document.getElementById("modalNewgame").checked = false;
      };
      const cIdx = this.challenges.findIndex(
        c => c.from.sid == this.st.user.sid && c.type == ctype);
      if (cIdx >= 0)
      {
        // Delete current challenge (will be replaced now)
        sendSomethingTo(this.challenges[cIdx].to,
          "deletechallenge", {cid:this.challenges[cIdx].id});
        if (ctype == "corr")
        {
          ajax(
            "/challenges",
            "DELETE",
            {id: this.challenges[cIdx].id}
          );
        }
        this.challenges.splice(cIdx, 1);
      }
      if (ctype == "live")
      {
        // Live challenges have a random ID
        finishAddChallenge();
      }
      else
      {
        // Correspondance game: send challenge to server
        ajax(
          "/challenges",
          "POST",
          chall,
          response => { finishAddChallenge(response.cid); }
        );
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
    newGame: function(cid) {
      // TODO: don't forget to send "deletechallenge" message to all concerned players
      // + setup colors and send game infos to players (message "newgame")
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
