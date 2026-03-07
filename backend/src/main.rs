use clap::Parser;
use rust_embed::RustEmbed;
use std::{net::SocketAddr, str::FromStr};
use tokio::net::TcpListener;

mod routes;
mod helpers;
pub mod routers;
pub mod openapi;

#[derive(RustEmbed)]
#[folder = "../frontend/dist/"]
struct Assets;

const APP_NAME: &str = "dock-sight";

#[derive(Parser)]
#[command(name = "dock-sight", about = "dock-sight — Monitor Docker services and system metrics")]
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
    let app = routes::create_router(args.dev);
    let addr = SocketAddr::from_str(&format!("0.0.0.0:{}", args.port)).unwrap();

    let mode_text = if args.dev {
        "\x1b[33mDEV\x1b[0m"
    } else {
        "\x1b[32mPROD\x1b[0m"
    };

    println!(
        "🚀 {} active at http://{} → mode: {}",
        APP_NAME,
        addr,
        mode_text
    );

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}