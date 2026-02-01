# Rust install debug
RUSTFLAGS="-C link-arg=-framework -C link-arg=AppKit" cargo install cargo-watch --locked --no-default-features

# DEV
## Rust
cargo run -- --dev
cargo watch -x 'run -- --dev'

## Iniciar Astro NODE 24
pnpm dev

# PROD
## Compilar Astro
cd frontend
pnpm build

## Compilar app
cd ../backend
cargo clean
cargo build --release
./target/release/backend --port 8080