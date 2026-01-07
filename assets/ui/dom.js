export function $(id) {
  return document.getElementById(id);
}

export function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}
