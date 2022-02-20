import init, * as modus from '../pkg/modus_playground.js';

let query = null;
let init_done = false;

self.onmessage = function ({ data }) {
  query = data;
  if (init_done) {
    process();
  }
};

function process() {
  if (query === null) {
    return;
  }
  let res_text = [];
  let proof_tree;
  let query_id = query.query_id;
  try {
    proof_tree = modus.get_proof_tree(query.modusfile, query.query);
  } catch (e) {
    proof_tree = null;
    res_text.push(e.toString());
  }
  if (proof_tree) {
    let errors = proof_tree.get_errors;
    if (errors.trim().length > 0) {
      res_text.push(errors);
    }
    if (proof_tree.success) {
      for (let proof of proof_tree.get_proofs) {
        res_text.push(proof);
      }
    } else {
      res_text.push("Failed to generate proof.");
    }
  }
  postMessage({
    query_id, res_text: res_text.join("\n")
  });
  query = null;
}

init().then(() => {
  process();
  init_done = true;
});
