let worker = null;
let input = document.querySelector('.modusfile-input');
let query = document.querySelector('.modus-query');
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
