use clap::Parser;
use rust_embed::RustEmbed;
use std::{net::SocketAddr, str::FromStr};
use tokio::net::TcpListener;

// Imports necessaris
mod routes;
mod helpers;
pub mod routers;
pub mod openapi; // Añade este módulo

// --- 🔹 Embed del frontend buildat ---
#[derive(RustEmbed)]
#[folder = "../frontend/dist/"]
struct Assets;

#[derive(Parser)]
#[command(name = "MyApp", about = "Servidor web Rust + Astro")]
struct Args {
    #[arg(short, long, default_value = "8080")]
    port: u16,

    /// Mode desenvolupament (no serveix frontend)
    #[arg(long, default_value_t = false)]
    dev: bool,
}

// --- 🚀 MAIN ---
#[tokio::main]
async fn main() {
    let args: Args = Args::parse();
    let app = routes::create_router(args.dev);
    let addr = SocketAddr::from_str(&format!("0.0.0.0:{}", args.port)).unwrap();

    // 🔹 Determinar el mode actual amb color i text clar
    let mode_text = if args.dev {
        "\x1b[33mDEV (sense frontend embedat)\x1b[0m" // groc
    } else {
        "\x1b[32mPROD (amb frontend Astro buildat)\x1b[0m" // verd
    };

    println!(
        "🚀 Servidor actiu a http://{} → mode: {}",
        addr,
        mode_text
    );

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}