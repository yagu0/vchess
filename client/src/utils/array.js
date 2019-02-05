// Remove item(s) in array (if present)
export const ArrayFun =
{
  remove: function(array, rfun, all)
  {
    const index = array.findIndex(rfun);
    if (index >= 0)
    {
      array.splice(index, 1);
      if (!!all)
      {
        // Reverse loop because of the splice below
        for (let i=array.length-1; i>=index; i--)
        {
          if (rfun(array[i]))
            array.splice(i, 1);
        }
      }
    }
  },

  // Double array intialization
  init: function(size1, size2, initElem)
  {
    return [...Array(size1)].map(e => Array(size2).fill(initElem));
  },

  range: function(max)
  {
    return [...Array(max).keys()];
  },
};
