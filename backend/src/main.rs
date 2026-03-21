use clap::Parser;
use rust_embed::RustEmbed;
use std::{net::SocketAddr, str::FromStr};
use tokio::net::TcpListener;

mod routes;
pub mod system;
pub mod docker;
pub mod openapi;

#[derive(RustEmbed)]
#[folder = "../frontend/dist/"]
struct Assets;

#[derive(Parser)]
#[command(name = "Dock Sight", about = "Dock Sight — Monitor Docker services and system metrics")]
struct Args {
    #[arg(short, long, default_value = "8080")]
    port: u16,

    #[arg(long, default_value_t = false)]
    dev: bool,
}

// --- 🚀 MAIN ---
#[tokio::main]
async fn main() {
    let args: Args = Args::parse();
    let app = routes::create_router(args.dev, args.port);
    let addr = SocketAddr::from_str(&format!("0.0.0.0:{}", args.port)).unwrap();

    let mode_label = if args.dev {
        "\x1b[33mDEV\x1b[0m"
    } else {
        "\x1b[32mPROD\x1b[0m"
    };

    println!("");
    println!("  \x1b[1mDock Sight\x1b[0m — Docker services & system metrics dashboard");
    println!("");
    println!("  Monitors your host (CPU, RAM, disk, network) and Docker");
    println!("  containers in real time, accessible from any browser.");
    println!("");
    println!("  \x1b[1mOpen\x1b[0m  →  \x1b[36mhttp://localhost:{}\x1b[0m", args.port);
    println!("  Mode  →  {}", mode_label);
    println!("");

    let listener = TcpListener::bind(addr).await.unwrap_or_else(|_| {
        eprintln!("");
        eprintln!("  \x1b[31m✖ Port {} is already in use.\x1b[0m", args.port);
        eprintln!("");
        eprintln!("  Another process is listening on that port.");
        eprintln!("  Try a different port:");
        eprintln!("");
        eprintln!("    dock-sight --port 9090");
        eprintln!("");
        std::process::exit(1);
    });
    axum::serve(listener, app).await.unwrap();
}