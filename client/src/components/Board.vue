<script>
import { getSquareId, getSquareFromId } from "@/utils/squareId";
import { ArrayFun } from "@/utils/array";
import { store } from "@/store";
export default {
  name: "my-board",
  // Last move cannot be guessed from here, and is required to highlight squares
  // vr: object to check moves, print board...
  // userColor is left undefined for an external observer
  props: [
    "vr",
    "lastMove",
    "analyze",
    "score",
    "incheck",
    "orientation",
    "userColor",
    "vname"
  ],
  data: function() {
    return {
      possibleMoves: [], //filled after each valid click/dragstart
      choices: [], //promotion pieces, or checkered captures... (as moves)
      selectedPiece: null, //moving piece (or clicked piece)
      start: {}, //pixels coordinates + id of starting square (click or drag)
      settings: store.state.settings
    };
  },
  render(h) {
    if (!this.vr) {
      // Return empty div of class 'game' to avoid error when setting size
      return h("div", {
        class: {
          game: true
        }
      });
    }
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    // Precompute hints squares to facilitate rendering
    let hintSquares = ArrayFun.init(sizeX, sizeY, false);
    this.possibleMoves.forEach(m => {
      hintSquares[m.end.x][m.end.y] = true;
    });
    // Also precompute in-check squares
    let incheckSq = ArrayFun.init(sizeX, sizeY, false);
    this.incheck.forEach(sq => {
      incheckSq[sq[0]][sq[1]] = true;
    });

    // Create board element (+ reserves if needed by variant)
    const lm = this.lastMove;
    const showLight = this.settings.highlight && V.ShowMoves == "all";
    const gameDiv = h(
      "div",
      {
        class: {
          game: true,
          clearer: true
        }
      },
      [...Array(sizeX).keys()].map(i => {
        let ci = !V.CanFlip || this.orientation == "w" ? i : sizeX - i - 1;
        return h(
          "div",
          {
            class: {
              row: true
            },
            style: { opacity: this.choices.length > 0 ? "0.5" : "1" }
          },
          [...Array(sizeY).keys()].map(j => {
            let cj = !V.CanFlip || this.orientation == "w" ? j : sizeY - j - 1;
            let elems = [];
            if (
              this.vr.board[ci][cj] != V.EMPTY &&
              (!this.vr.enlightened || this.analyze || this.score != "*" ||
                (!!this.userColor &&
                  this.vr.enlightened[this.userColor][ci][cj]))
            ) {
              elems.push(
                h("img", {
                  class: {
                    piece: true,
                    ghost:
                      !!this.selectedPiece &&
                      this.selectedPiece.parentNode.id == "sq-" + ci + "-" + cj
                  },
                  attrs: {
                    src:
                      "/images/pieces/" +
                      this.vr.getPpath(this.vr.board[ci][cj], this.userColor, this.score) +
                      ".svg"
                  }
                })
              );
            }
            if (this.settings.hints && hintSquares[ci][cj]) {
              elems.push(
                h("img", {
                  class: {
                    "mark-square": true
                  },
                  attrs: {
                    src: "/images/mark.svg"
                  }
                })
              );
            }
            return h(
              "div",
              {
                class: {
                  board: true,
                  ["board" + sizeY]: true,
                  "light-square": (i + j) % 2 == 0,
                  "dark-square": (i + j) % 2 == 1,
                  [this.settings.bcolor]: true,
                  "in-shadow":
                    !this.analyze &&
                    this.score == "*" &&
                    this.vr.enlightened &&
                    (!this.userColor ||
                      !this.vr.enlightened[this.userColor][ci][cj]),
                  highlight:
                    showLight && !!lm && lm.end.x == ci && lm.end.y == cj,
                  incheck: showLight && incheckSq[ci][cj]
                },
                attrs: {
                  id: getSquareId({ x: ci, y: cj })
                }
              },
              elems
            );
          })
        );
      })
    );
    let elementArray = [gameDiv];
    const playingColor = this.userColor || "w"; //default for an observer
    if (this.vr.reserve) {
      const shiftIdx = playingColor == "w" ? 0 : 1;
      let myReservePiecesArray = [];
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        myReservePiecesArray.push(
          h(
            "div",
            {
              class: { board: true, ["board" + sizeY]: true },
              attrs: { id: getSquareId({ x: sizeX + shiftIdx, y: i }) }
            },
            [
              h("img", {
                class: { piece: true, reserve: true },
                attrs: {
                  src:
                    "/images/pieces/" +
                    this.vr.getReservePpath(i, playingColor) +
                    ".svg"
                }
              }),
              h("sup", { class: { "reserve-count": true } }, [
                this.vr.reserve[playingColor][V.RESERVE_PIECES[i]]
              ])
            ]
          )
        );
      }
      let oppReservePiecesArray = [];
      const oppCol = V.GetOppCol(playingColor);
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        oppReservePiecesArray.push(
          h(
            "div",
            {
              class: { board: true, ["board" + sizeY]: true },
              attrs: { id: getSquareId({ x: sizeX + (1 - shiftIdx), y: i }) }
            },
            [
              h("img", {
                class: { piece: true, reserve: true },
                attrs: {
                  src:
                    "/images/pieces/" +
                    this.vr.getReservePpath(i, oppCol) +
                    ".svg"
                }
              }),
              h("sup", { class: { "reserve-count": true } }, [
                this.vr.reserve[oppCol][V.RESERVE_PIECES[i]]
              ])
            ]
          )
        );
      }
      let reserves = h(
        "div",
        {
          class: {
            game: true,
            "reserve-div": true
          }
        },
        [
          h(
            "div",
            {
              class: {
                row: true,
                "reserve-row-1": true
              }
            },
            myReservePiecesArray
          ),
          h("div", { class: { row: true } }, oppReservePiecesArray)
        ]
      );
      elementArray.push(reserves);
    }
    const boardElt = document.querySelector(".game");
    if (this.choices.length > 0 && !!boardElt) {
      //no choices to show at first drawing
      const squareWidth = boardElt.offsetWidth / sizeY;
      const offset = [boardElt.offsetTop, boardElt.offsetLeft];
      const choices = h(
        "div",
        {
          attrs: { id: "choices" },
          class: { row: true },
          style: {
            top: offset[0] + (sizeY / 2) * squareWidth - squareWidth / 2 + "px",
            left:
              offset[1] +
              (squareWidth * (sizeY - this.choices.length)) / 2 +
              "px",
            width: this.choices.length * squareWidth + "px",
            height: squareWidth + "px"
          }
        },
        this.choices.map(m => {
          //a "choice" is a move
          return h(
            "div",
            {
              class: {
                board: true,
                ["board" + sizeY]: true
              },
              style: {
                width: 100 / this.choices.length + "%",
                "padding-bottom": 100 / this.choices.length + "%"
              }
            },
            [
              h("img", {
                attrs: {
                  src:
                    "/images/pieces/" +
                    this.vr.getPpath(m.appear[0].c + m.appear[0].p) +
                    ".svg"
                },
                class: { "choice-piece": true },
                on: {
                  click: () => {
                    this.play(m);
                    this.choices = [];
                  }
                }
              })
            ]
          );
        })
      );
      elementArray.unshift(choices);
    }
    let onEvents = {};
    // NOTE: click = mousedown + mouseup
    if ("ontouchstart" in window) {
      onEvents = {
        on: {
          touchstart: this.mousedown,
          touchmove: this.mousemove,
          touchend: this.mouseup
        }
      };
    } else {
      onEvents = {
        on: {
          mousedown: this.mousedown,
          mousemove: this.mousemove,
          mouseup: this.mouseup
        }
      };
    }
    return h("div", onEvents, elementArray);
  },
  methods: {
    mousedown: function(e) {
      // Abort if a piece is already being processed, or target is not a piece.
      // NOTE: just looking at classList[0] because piece is the first assigned class
      if (!!this.selectedPiece || e.target.classList[0] != "piece") return;
      e.preventDefault(); //disable native drag & drop
      let parent = e.target.parentNode; //the surrounding square
      // Next few lines to center the piece on mouse cursor
      let rect = parent.getBoundingClientRect();
      this.start = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.width / 2,
        id: parent.id
      };
      this.selectedPiece = e.target.cloneNode();
      let spStyle = this.selectedPiece.style;
      spStyle.position = "absolute";
      spStyle.top = 0;
      spStyle.display = "inline-block";
      spStyle.zIndex = 3000;
      const startSquare = getSquareFromId(parent.id);
      this.possibleMoves = [];
      const color = this.analyze ? this.vr.turn : this.userColor;
      if (this.vr.canIplay(color, startSquare))
        this.possibleMoves = this.vr.getPossibleMovesFrom(startSquare);
      // Next line add moving piece just after current image
      // (required for Crazyhouse reserve)
      parent.insertBefore(this.selectedPiece, e.target.nextSibling);
    },
    mousemove: function(e) {
      if (!this.selectedPiece) return;
      // There is an active element: move it around
      const [offsetX, offsetY] = e.clientX
        ? [e.clientX, e.clientY] //desktop browser
        : [e.changedTouches[0].pageX, e.changedTouches[0].pageY]; //smartphone
      this.selectedPiece.style.left = offsetX - this.start.x + "px";
      this.selectedPiece.style.top = offsetY - this.start.y + "px";
    },
    mouseup: function(e) {
      if (!this.selectedPiece) return;
      // There is an active element: obtain the move from start and end squares
      this.selectedPiece.style.zIndex = -3000; //HACK to find square from final coords
      const [offsetX, offsetY] = e.clientX
        ? [e.clientX, e.clientY]
        : [e.changedTouches[0].pageX, e.changedTouches[0].pageY];
      let landing = document.elementFromPoint(offsetX, offsetY);
      this.selectedPiece.style.zIndex = 3000;
      // Next condition: classList.contains(piece) fails because of marks
      while (landing.tagName == "IMG") landing = landing.parentNode;
      if (this.start.id == landing.id)
        // One or multi clicks on same piece
        return;
      // OK: process move attempt, landing is a square node
      let endSquare = getSquareFromId(landing.id);
      let moves = this.findMatchingMoves(endSquare);
      this.possibleMoves = [];
      if (moves.length > 1) this.choices = moves;
      else if (moves.length == 1) this.play(moves[0]);
      // Else: impossible move
      this.selectedPiece.parentNode.removeChild(this.selectedPiece);
      delete this.selectedPiece;
      this.selectedPiece = null;
    },
    findMatchingMoves: function(endSquare) {
      // Run through moves list and return the matching set (if promotions...)
      let moves = [];
      this.possibleMoves.forEach(function(m) {
        if (endSquare[0] == m.end.x && endSquare[1] == m.end.y) moves.push(m);
      });
      return moves;
    },
    play: function(move) {
      this.$emit("play-move", move);
    }
  }
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

img.ghost
  position: absolute
  opacity: 0.4
  top: 0

.highlight
  background-color: #00cc66 !important

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
