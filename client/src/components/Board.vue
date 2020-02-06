<script>
import { getSquareId, getSquareFromId } from "@/utils/squareId";
import { ArrayFun } from "@/utils/array";
import { store } from "@/store";

export default {
  name: 'my-board',
  // Last move cannot be guessed from here, and is required to highlight squares
  // vr: object to check moves, print board...
  // userColor is left undefined for an external observer
  props: ["vr","lastMove","analyze","incheck","orientation","userColor","vname"],
  data: function () {
    return {
      possibleMoves: [], //filled after each valid click/dragstart
      choices: [], //promotion pieces, or checkered captures... (as moves)
      selectedPiece: null, //moving piece (or clicked piece)
      start: {}, //pixels coordinates + id of starting square (click or drag)
      settings: store.state.settings,
    };
  },
  render(h) {
    if (!this.vr)
    {
      // Return empty div of class 'game' to avoid error when setting size
      return h("div",
        {
          "class": {
            "game": true,
          },
        });
    }
    const [sizeX,sizeY] = [V.size.x,V.size.y];
    // Precompute hints squares to facilitate rendering
    let hintSquares = ArrayFun.init(sizeX, sizeY, false);
    this.possibleMoves.forEach(m => { hintSquares[m.end.x][m.end.y] = true; });
    // Also precompute in-check squares
    let incheckSq = ArrayFun.init(sizeX, sizeY, false);
    this.incheck.forEach(sq => { incheckSq[sq[0]][sq[1]] = true; });

    let boardElt = document.querySelector(".game");
    const squareWidth = (!!boardElt
      ? boardElt.offsetWidth / sizeY
      : 40); //arbitrary value (not relevant)
    const offset = (!!boardElt
      ? [boardElt.offsetTop, boardElt.offsetLeft]
      : [0, 0]);
    const choices = h(
      'div',
      {
        attrs: { "id": "choices" },
        'class': { 'row': true },
        style: {
          "display": (this.choices.length > 0 ? "block" : "none"),
          "top": (offset[0] + (sizeY/2)*squareWidth-squareWidth/2) + "px",
          "left": (offset[1] + squareWidth*(sizeY - this.choices.length)/2) + "px",
          "width": (this.choices.length * squareWidth) + "px",
          "height": squareWidth + "px",
        },
      },
      this.choices.map(m => { //a "choice" is a move
        return h('div',
          {
            'class': {
              'board': true,
              ['board'+sizeY]: true,
            },
            style: {
              'width': (100/this.choices.length) + "%",
              'padding-bottom': (100/this.choices.length) + "%",
            },
          },
          [h('img',
            {
              attrs: { "src": '/images/pieces/' +
                V.getPpath(m.appear[0].c+m.appear[0].p) + '.svg' },
              'class': { 'choice-piece': true },
              on: {
                "click": e => { this.play(m); this.choices=[]; },
                // NOTE: add 'touchstart' event to fix a problem on smartphones
                "touchstart": e => { this.play(m); this.choices=[]; },
              },
            })
          ]
        );
      })
    );
    // Create board element (+ reserves if needed by variant or mode)
    const lm = this.lastMove;
    const showLight = this.settings.highlight && this.vname != "Dark";
    const gameDiv = h(
      'div',
      {
        'class': {
          'game': true,
          'clearer': true,
        },
      },
      [...Array(sizeX).keys()].map(i => {
        let ci = (this.orientation=='w' ? i : sizeX-i-1);
        return h(
          'div',
          {
            'class': {
              'row': true,
            },
            style: { 'opacity': this.choices.length>0?"0.5":"1" },
          },
          [...Array(sizeY).keys()].map(j => {
            let cj = (this.orientation=='w' ? j : sizeY-j-1);
            let elems = [];
            if (this.vr.board[ci][cj] != V.EMPTY && (this.vname!="Dark"
              || this.analyze || (!!this.userColor
                && this.vr.enlightened[this.userColor][ci][cj])))
            {
              elems.push(
                h(
                  'img',
                  {
                    'class': {
                      'piece': true,
                      'ghost': !!this.selectedPiece
                        && this.selectedPiece.parentNode.id == "sq-"+ci+"-"+cj,
                    },
                    attrs: {
                      src: "/images/pieces/" +
                        V.getPpath(this.vr.board[ci][cj]) + ".svg",
                    },
                  }
                )
              );
            }
            if (this.settings.hints && hintSquares[ci][cj])
            {
              elems.push(
                h(
                  'img',
                  {
                    'class': {
                      'mark-square': true,
                    },
                    attrs: {
                      src: "/images/mark.svg",
                    },
                  }
                )
              );
            }
            return h(
              'div',
              {
                'class': {
                  'board': true,
                  ['board'+sizeY]: true,
                  'light-square': (i+j)%2==0,
                  'dark-square': (i+j)%2==1,
                  [this.settings.bcolor]: true,
                  'in-shadow': this.vname=="Dark" && !this.analyze
                    && (!this.userColor
                      || !this.vr.enlightened[this.userColor][ci][cj]),
                  'highlight': showLight && !!lm && lm.end.x == ci && lm.end.y == cj,
                  'incheck': showLight && incheckSq[ci][cj],
                },
                attrs: {
                  id: getSquareId({x:ci,y:cj}),
                },
              },
              elems
            );
          })
        );
      })
    );
    const playingColor = this.userColor || "w"; //default for an observer
    let elementArray = [choices, gameDiv];
    if (!!this.vr.reserve)
    {
      const shiftIdx = (playingColor=="w" ? 0 : 1);
      let myReservePiecesArray = [];
      for (let i=0; i<V.RESERVE_PIECES.length; i++)
      {
        myReservePiecesArray.push(h('div',
        {
          'class': {'board':true, ['board'+sizeY]:true},
          attrs: { id: getSquareId({x:sizeX+shiftIdx,y:i}) }
        },
        [
          h('img',
          {
            'class': {"piece":true, "reserve":true},
            attrs: {
              "src": "/images/pieces/" +
                this.vr.getReservePpath(playingColor,i) + ".svg",
            }
          }),
          h('sup',
            {"class": { "reserve-count": true } },
            [ this.vr.reserve[playingColor][V.RESERVE_PIECES[i]] ]
          )
        ]));
      }
      let oppReservePiecesArray = [];
      const oppCol = V.GetOppCol(playingColor);
      for (let i=0; i<V.RESERVE_PIECES.length; i++)
      {
        oppReservePiecesArray.push(h('div',
        {
          'class': {'board':true, ['board'+sizeY]:true},
          attrs: { id: getSquareId({x:sizeX+(1-shiftIdx),y:i}) }
        },
        [
          h('img',
          {
            'class': {"piece":true, "reserve":true},
            attrs: {
              "src": "/images/pieces/" +
                this.vr.getReservePpath(oppCol,i) + ".svg",
            }
          }),
          h('sup',
            {"class": { "reserve-count": true } },
            [ this.vr.reserve[oppCol][V.RESERVE_PIECES[i]] ]
          )
        ]));
      }
      let reserves = h('div',
        {
          'class':{
            'game': true,
            "reserve-div": true,
          },
        },
        [
          h('div',
            {
              'class': {
                'row': true,
                "reserve-row-1": true,
              },
            },
            myReservePiecesArray
          ),
          h('div',
            { 'class': { 'row': true }},
            oppReservePiecesArray
          )
        ]
      );
      elementArray.push(reserves);
    }
    return h(
      'div',
      {
        // NOTE: click = mousedown + mouseup
        on: {
          mousedown: this.mousedown,
          mousemove: this.mousemove,
          mouseup: this.mouseup,
          touchstart: this.mousedown,
          touchmove: this.mousemove,
          touchend: this.mouseup,
        },
      },
      elementArray
    );
  },
  methods: {
    mousedown: function(e) {
      e = e || window.event;
      let ingame = false;
      let elem = e.target;
      while (!ingame && elem !== null)
      {
        if (elem.classList.contains("game"))
        {
          ingame = true;
          break;
        }
        elem = elem.parentElement;
      }
      if (!ingame) //let default behavior (click on button...)
        return;
      e.preventDefault(); //disable native drag & drop
      if (!this.selectedPiece && e.target.classList.contains("piece"))
      {
        // Next few lines to center the piece on mouse cursor
        let rect = e.target.parentNode.getBoundingClientRect();
        this.start = {
          x: rect.x + rect.width/2,
          y: rect.y + rect.width/2,
          id: e.target.parentNode.id
        };
        this.selectedPiece = e.target.cloneNode();
        this.selectedPiece.style.position = "absolute";
        this.selectedPiece.style.top = 0;
        this.selectedPiece.style.display = "inline-block";
        this.selectedPiece.style.zIndex = 3000;
        const startSquare = getSquareFromId(e.target.parentNode.id);
        this.possibleMoves = [];
        const color = (this.analyze ? this.vr.turn : this.userColor);
        if (this.vr.canIplay(color,startSquare))
          this.possibleMoves = this.vr.getPossibleMovesFrom(startSquare);
        // Next line add moving piece just after current image
        // (required for Crazyhouse reserve)
        e.target.parentNode.insertBefore(this.selectedPiece, e.target.nextSibling);
      }
    },
    mousemove: function(e) {
      if (!this.selectedPiece)
        return;
      e = e || window.event;
      // If there is an active element, move it around
      if (!!this.selectedPiece)
      {
        const [offsetX,offsetY] = !!e.clientX
          ? [e.clientX,e.clientY] //desktop browser
          : [e.changedTouches[0].pageX, e.changedTouches[0].pageY]; //smartphone
        this.selectedPiece.style.left = (offsetX-this.start.x) + "px";
        this.selectedPiece.style.top = (offsetY-this.start.y) + "px";
      }
    },
    mouseup: function(e) {
      if (!this.selectedPiece)
        return;
      e = e || window.event;
      // Read drop target (or parentElement, parentNode... if type == "img")
      this.selectedPiece.style.zIndex = -3000; //HACK to find square from final coords
      const [offsetX,offsetY] = !!e.clientX
        ? [e.clientX,e.clientY]
        : [e.changedTouches[0].pageX, e.changedTouches[0].pageY];
      let landing = document.elementFromPoint(offsetX, offsetY);
      this.selectedPiece.style.zIndex = 3000;
      // Next condition: classList.contains(piece) fails because of marks
      while (landing.tagName == "IMG")
        landing = landing.parentNode;
      if (this.start.id == landing.id)
      {
        // A click: selectedPiece and possibleMoves are already filled
        return;
      }
      // OK: process move attempt
      let endSquare = getSquareFromId(landing.id);
      let moves = this.findMatchingMoves(endSquare);
      this.possibleMoves = [];
      if (moves.length > 1)
        this.choices = moves;
      else if (moves.length==1)
        this.play(moves[0]);
      // Else: impossible move
      this.selectedPiece.parentNode.removeChild(this.selectedPiece);
      delete this.selectedPiece;
      this.selectedPiece = null;
    },
    findMatchingMoves: function(endSquare) {
      // Run through moves list and return the matching set (if promotions...)
      let moves = [];
      this.possibleMoves.forEach(function(m) {
        if (endSquare[0] == m.end.x && endSquare[1] == m.end.y)
          moves.push(m);
      });
      return moves;
    },
    play: function(move) {
      this.$emit('play-move', move);
    },
  },
};
</script>

<style lang="sass" scoped>
.game.reserve-div
  margin-bottom: 18px

.reserve-count
  padding-left: 40%

.reserve-row-1
  margin-bottom: 15px

// NOTE: no variants with reserve of size != 8

div.board
  float: left
  height: 0
  display: inline-block
  position: relative

div.board8
  width: 12.5%
  padding-bottom: 12.5%

div.board10
  width: 10%
  padding-bottom: 10%

div.board11
  width: 9.09%
  padding-bottom: 9.1%

.game
  width: 100%
  margin: 0
  .board
    cursor: pointer

#choices
  margin: 0
  position: absolute
  z-index: 300
  overflow-y: inherit
  background-color: rgba(0,0,0,0)
  img
    cursor: pointer
    background-color: #e6ee9c
    &:hover
      background-color: skyblue
    &.choice-piece
      width: 100%
      height: auto
      display: block

img.piece
  width: 100%

img.piece, img.mark-square
  max-width: 100%
  height: auto
  display: block

img.mark-square
  opacity: 0.6
  width: 76%
  position: absolute
  top: 12%
  left: 12%
  opacity: .7

img.ghost
  position: absolute
  opacity: 0.4
  top: 0

.highlight
  background-color: #00cc66 !important

.in-shadow
  filter: brightness(50%)

.incheck
  background-color: #cc3300 !important

.light-square.lichess
  background-color: #f0d9b5;
.dark-square.lichess
  background-color: #b58863;

.light-square.chesscom
  background-color: #e5e5ca;
.dark-square.chesscom
  background-color: #6f8f57;

.light-square.chesstempo
  background-color: #fdfdfd;
.dark-square.chesstempo
  background-color: #88a0a8;
</style>
