fn main() {
    if std::env::args().any(|arg| arg == "--backup-only") {
        let ok = f1_immobiliare_desktop_lib::run_backup_only().is_ok();
        std::process::exit(if ok { 0 } else { 1 });
    }
    f1_immobiliare_desktop_lib::run();
}
