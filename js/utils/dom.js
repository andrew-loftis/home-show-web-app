// DOM helpers
export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "class") node.className = v;
    else node[k] = v;
  });
  children.flat().forEach(c => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return node;
}
export function mount(parent, child) {
  parent.innerHTML = "";
  parent.appendChild(child);
}
export function delegate(root, sel, event, handler) {
  root.addEventListener(event, e => {
    if (e.target.matches(sel)) handler(e);
  });
}
