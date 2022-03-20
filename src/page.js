let worker = null;
let input = document.querySelector('.modusfile-input');
let query = document.querySelector('.modus-goal');
let res = document.querySelector('.result');
let progress_bar = document.querySelector('.progress-bar');
let last_query_id = 0;
let last_query_completed = true;

function init_worker() {
  if (worker !== null) {
    worker.terminate();
  }
  worker = new Worker(new URL('worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = function ({ data }) {
    if (data.query_id != last_query_id) {
      return;
    }
    res.innerHTML = "";
    for (let block of data.res.spans) {
      let node = document.createElement("span");
      node.textContent = block.text;
      node.setAttribute("style", block.css);
      res.appendChild(node);
    }
    res.classList.remove("loading");
    progress_bar.style.visibility = "hidden";
    last_query_completed = true;
  }
}

init_worker();

function update() {
  if (!last_query_completed) {
    init_worker();
  }
  last_query_id += 1;
  res.classList.add("loading");
  progress_bar.style.visibility = "";
  worker.postMessage({
    query: query.value,
    modusfile: input.value,
    query_id: last_query_id
  });
  last_query_completed = false;
}

input.addEventListener('input', update);
query.addEventListener('input', update);
update();

let left_area = document.querySelector(".input-area");
let divider = document.querySelector(".divider");

let desktop_mode = window.innerWidth >= 1000;

divider.addEventListener("mousedown", function (evt) {
  if (!desktop_mode) {
    return;
  }
  evt.preventDefault();
  let down_w = parseFloat(window.getComputedStyle(left_area).width);
  let offset = down_w - evt.clientX;
  function up_handler(evt) {
    evt.preventDefault();
    window.removeEventListener("mouseup", up_handler);
    window.removeEventListener("mousemove", move_handler);
  }
  function move_handler(evt) {
    evt.preventDefault();
    let new_w = evt.clientX + offset;
    left_area.style.width = Math.max(100, Math.min(new_w, window.innerWidth - 100)) + "px";
    left_area.style.flexBasis = "auto";
    left_area.style.flexShrink = "0";
    left_area.style.flexGrow = "0";
  }
  window.addEventListener("mouseup", up_handler);
  window.addEventListener("mousemove", move_handler);
});

window.addEventListener("resize", function () {
  if (desktop_mode && window.innerWidth < 1000) {
    desktop_mode = false;
    left_area.style.width = "";
    left_area.style.flexBasis = "";
    left_area.style.flexShrink = "";
    left_area.style.flexGrow = "";
  } else if (!desktop_mode && window.innerWidth >= 1000) {
    desktop_mode = true;
  }
});

let share_btn = document.querySelector(".share-btn");
let share_msg = document.querySelector(".share-msg");
share_btn.addEventListener("click", function () {
  let q = query.value;
  let m = input.value;
  window.location.hash = "#" + encodeURIComponent(JSON.stringify({ q, m }));
  share_msg.innerHTML = "Link generated. Copy from address bar!";
});

let current_hash = window.location.hash;
if (current_hash.startsWith("#")) {
  let json = JSON.parse(decodeURIComponent(current_hash.substring(1)));
  query.value = json.q;
  input.value = json.m;
  update();
  window.location.hash = "";
}
