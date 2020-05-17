// Remove item(s) in array (if present)
export const ArrayFun = {
  remove: function(arr, rfun, all) {
    const index = arr.findIndex(rfun);
    if (index >= 0) {
      arr.splice(index, 1);
      if (!!all) {
        // Reverse loop because of the splice below
        for (let i = arr.length - 1; i >= index; i--) {
          if (rfun(arr[i])) arr.splice(i, 1);
        }
      }
    }
  },

  // Double array intialization
  init: function(size1, size2, initElem) {
    return [...Array(size1)].map(() => Array(size2).fill(initElem));
  },

  range: function(max) {
    return [...Array(max).keys()];
  }
};
