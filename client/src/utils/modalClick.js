export function processModalClick(e) {
  // Close a modal when click on it but outside focused element
  const data = e.target.dataset;
  if (data.checkbox) document.getElementById(data.checkbox).checked = false;
}
