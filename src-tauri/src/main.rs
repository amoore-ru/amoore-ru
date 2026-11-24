// Десктопная точка входа; на Android используется lib.rs (mobile_entry_point).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    amoore_app_lib::run()
}
