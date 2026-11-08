// Paste into the browser javascript tool to compare the React page with the legacy page.
//
// 1) Tab A: http://localhost:3000/studio/legacy  (original HTML in an iframe)
//    Tab B: http://localhost:3000/studio/<page>   (React port)
// 2) In tab A run:   await legacySnap("mocks")      -> snapshot object
//    In tab B run:   reactSnap()                    -> same shape
// 3) Compare "text" (normalised visible text) and "classes" (element tag.class counts).
//    Paste both results into one tab and call diffSnaps(a, b).
//
// legacySnap(pageId) clicks the sidebar link inside the iframe, waits, and snapshots #mainContent.

function snapOf(root) {
  const text = root.innerText.replace(/\s+/g, " ").trim();
  const classes = {};
  root.querySelectorAll("*").forEach((el) => {
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).sort().join(".") : "";
    const key = el.tagName.toLowerCase() + cls;
    classes[key] = (classes[key] || 0) + 1;
  });
  return { length: text.length, text, classes, elements: root.querySelectorAll("*").length };
}

async function legacySnap(pageId, wait = 1500) {
  const win = document.querySelector("iframe").contentWindow;
  win.document.querySelector(`.side-nav [data-page="${pageId}"]`).click();
  await new Promise((r) => setTimeout(r, wait));
  return snapOf(win.document.getElementById("mainContent"));
}

function reactSnap() {
  return snapOf(document.getElementById("mainContent"));
}

function diffSnaps(a, b) {
  const onlyA = [];
  const onlyB = [];
  const keys = new Set([...Object.keys(a.classes), ...Object.keys(b.classes)]);
  for (const k of keys) {
    const x = a.classes[k] || 0;
    const y = b.classes[k] || 0;
    if (x > y) onlyA.push(`${k} x${x - y}`);
    if (y > x) onlyB.push(`${k} x${y - x}`);
  }
  return {
    textEqual: a.text === b.text,
    lengthA: a.length,
    lengthB: b.length,
    missingInReact: onlyA.slice(0, 40),
    extraInReact: onlyB.slice(0, 40),
  };
}
