fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|arg| arg == "--self-test") {
        match f1_immobiliare_desktop_lib::run_self_test() {
            Ok(()) => {
                println!("F1_DESKTOP_SELF_TEST_OK");
                std::process::exit(0);
            }
            Err(err) => {
                eprintln!("F1_DESKTOP_SELF_TEST_ERROR: {err}");
                std::process::exit(1);
            }
        }
    }
    if args.iter().any(|arg| arg == "--backup-only") {
        let ok = f1_immobiliare_desktop_lib::run_backup_only().is_ok();
        std::process::exit(if ok { 0 } else { 1 });
    }
    f1_immobiliare_desktop_lib::run();
}
