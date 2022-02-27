use codespan_reporting::term;
use modus_lib::{
    analysis::{check_and_output_analysis, ModusSemantics},
    modusfile::{Expression, Modusfile},
    sld::{self, tree_from_modusfile},
};

use ptree::{PrintConfig, print_config::StyleWhen};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ModusResult {
    pub success: bool,
    #[wasm_bindgen(skip)]
    pub errors: String,
    #[wasm_bindgen(skip)]
    pub proofs: Vec<String>,
}

#[wasm_bindgen]
impl ModusResult {
    #[wasm_bindgen(getter)]
    pub fn get_errors(&self) -> String {
        self.errors.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn get_proofs(&self) -> Vec<JsValue> {
        self.proofs.iter().map(|x| JsValue::from_str(x)).collect()
    }
}

#[wasm_bindgen]
pub fn get_proof_tree(mf_source: &str, goal: &str) -> ModusResult {
    let res = std::panic::catch_unwind(move || {
        let mf: Modusfile = match mf_source.parse() {
            Ok(mf) => mf,
            Err(e) => {
                return ModusResult {
                    success: false,
                    errors: format!("Unable to parse input:\n{}", e),
                    proofs: vec![],
                };
            }
        };
        let query: Expression = match goal.parse() {
            Ok(q) => q,
            Err(e) => {
                return ModusResult {
                    success: false,
                    errors: format!("Unable to parse query:\n{}", e),
                    proofs: vec![],
                };
            }
        };
        let query = query.without_position();

        let f = codespan_reporting::files::SimpleFile::new("Modusfile", mf_source);

        let mut analysis_err_buf = termcolor::Buffer::ansi();
        let kind_res = mf.kinds();
        if !check_and_output_analysis(&kind_res, &mf, false, &mut analysis_err_buf, &Default::default(), &f) {
            return ModusResult {
                success: false,
                errors: std::str::from_utf8(analysis_err_buf.as_slice())
                    .unwrap()
                    .to_owned(),
                proofs: vec![],
            };
        }

        let max_depth = 175;
        let (goal, clauses, sld_result) = tree_from_modusfile(mf, query.clone(), max_depth, true);

        let proof_result = Result::from(sld_result).map(|t| sld::proofs(&t, &clauses, &goal));
        let mut proofs = Vec::new();
        match proof_result {
            Ok(ps) => {
                for (_, proof) in ps {
                    let t = proof.get_tree(&clauses, &kind_res.pred_kind);
                    let mut tstr: Vec<u8> = Vec::new();
                    let mut pc = PrintConfig::default();
                    pc.styled = StyleWhen::Always;
                    ptree::write_tree_with(&t, &mut tstr, &pc).unwrap();
                    proofs.push(String::from_utf8_lossy(&tstr).into_owned());
                }
            }
            Err(e) => {
                for diag_error in e {
                    term::emit(&mut analysis_err_buf, &Default::default(), &f, &diag_error).unwrap();
                }
            }
        }

        return ModusResult {
            success: true,
            proofs,
            errors: String::from_utf8_lossy(analysis_err_buf.as_slice()).into_owned(),
        };
    });

    match res {
        Ok(r) => r,
        Err(e) => {
            ModusResult {
                success: false,
                proofs: vec![],
                errors: format!("Modus panicked: {:?}\nPlease report this at https://github.com/modus-continens/modus/issues", e),
            }
        }
    }
}
