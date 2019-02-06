<script>
import { store } from "@/store";
import { ArrayFun } from "@/utils/array";
export default {
  name: "my-diagrammer",
  props: ["fen","vname"],
  data: {
    function() {
      return {
        st: store.state,
        // args: object with position (mandatory), and
        // orientation, marks, shadow (optional)
        args: this.parseFen(this.fen),
      };
    }
  },
  render(h) {
    if (!window.V)
      return;
    // Obtain the array of pieces images names:
    const board = V.GetBoard(this.args.position);
    const orientation = this.args.orientation || "w";
    const markArray = this.getMarkArray(this.args.marks);
    const shadowArray = this.getShadowArray(this.args.shadow);
//    const [startX,startY,inc] = orientation == 'w'
//      ? [0, 0, 1]
//      : [V.size.x-1, V.size.y-1, -1];
    const diagDiv = h(
      'div',
      {
        'class': {
          'diagram': true,
        },
      },
      [...Array(V.size.x).keys()].map(i => {
        let ci = (orientation=='w' ? i : sizeX-i-1);
        return h(
          'div',
          {
            'class': {
              'row': true,
            },
          },
          [...Array(V.size.y).keys()].map(j => {
            let cj = (orientation=='w' ? j : sizeY-j-1);
            let elems = [];
            if (board[ci][cj] != V.EMPTY)
            {
              elems.push(
                h(
                  'img',
                  {
                    'class': {
                      'piece': true,
                    },
                    attrs: {
                      src: require("@/assets/images/pieces/" +
                        V.getPpath(board[ci][cj]) + ".svg"),
                    },
                  }
                )
              );
            }
            if (markArray.length > 0 && markArray[ci][cj])
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
                  ['board'+V.size.y]: true,
                  'light-square': (i+j)%2==0,
                  'dark-square': (i+j)%2==1,
                  [this.st.bcolor]: true,
                  'in-shadow': shadowArray.length > 0 && shadowArray[ci][cj],
                },
              },
              elems
            );
          })
        );
      })
    );
    return diagDiv;
  },
  methods: {
    parseFen: function(fen) {
      const fenParts = fen.split(" ");
      return {
        position: fenParts[0],
        marks: fenParts[1],
        orientation: fenParts[2],
        shadow: fenParts[3],
      };
    },
    // Turn (human) marks into coordinates
    getMarkArray: function(marks) {
      if (!marks || marks == "-")
        return [];
      let markArray = ArrayFun.init(V.size.x, V.size.y, false);
      const squares = marks.split(",");
      for (let i=0; i<squares.length; i++)
      {
        const coords = V.SquareToCoords(squares[i]);
        markArray[coords.x][coords.y] = true;
      }
      return markArray;
    },
    // Turn (human) shadow indications into coordinates
    getShadowArray: function(shadow) {
      if (!shadow || shadow == "-")
        return [];
      let shadowArray = ArrayFun.init(V.size.x, V.size.y, false);
      const squares = shadow.split(",");
      for (let i=0; i<squares.length; i++)
      {
        const rownum = V.size.x - parseInt(squares[i]);
        if (!isNaN(rownum))
        {
          // Shadow a full row
          for (let i=0; i<V.size.y; i++)
            shadowArray[rownum][i] = true;
          continue;
        }
        if (squares[i].length == 1)
        {
          // Shadow a full column
          const colnum = V.ColumnToCoord(squares[i]);
          for (let i=0; i<V.size.x; i++)
            shadowArray[i][colnum] = true;
          continue;
        }
        if (squares[i].indexOf("-") >= 0)
        {
          // Shadow a range of squares, horizontally or vertically
          const firstLastSq = squares[i].split("-");
          const range =
          [
            V.SquareToCoords(firstLastSq[0]),
            V.SquareToCoords(firstLastSq[1])
          ];
          const step =
          [
            range[1].x == range[0].x
              ? 0
              : (range[1].x - range[0].x) / Math.abs(range[1].x - range[0].x),
            range[1].y == range[0].y
              ? 0
              : (range[1].y - range[0].y) / Math.abs(range[1].y - range[0].y)
          ];
          // Convention: range always from smaller to larger number
          for (let x=range[0].x, y=range[0].y; x <= range[1].x && y <= range[1].y;
            x += step[0], y += step[1])
          {
            shadowArray[x][y] = true;
          }
          continue;
        }
        // Shadow just one square:
        const coords = V.SquareToCoords(squares[i]);
        shadowArray[coords.x][coords.y] = true;
      }
      return shadowArray;
    },
  },
};
</script>
