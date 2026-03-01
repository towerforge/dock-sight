# Dock Sight

Lightweight infrastructure dashboard for host metrics and Docker services.

## Quick Start (Linux Server)

1) Download the latest release artifact:

```bash
curl -fL -o dock-sight-linux-x86_64-v0.1.2.tar.gz \
https://github.com/towerforge/dock-sight/releases/download/v0.1.2/dock-sight-linux-x86_64-v0.1.2.tar.gz
```

2) Extract the package:

```bash
tar -xzf dock-sight-linux-x86_64-v0.1.2.tar.gz
```

3) Ensure the binary is executable:

```bash
chmod +x dock-sight
```

4) Run Dock Sight on port `8080`:

```bash
./dock-sight --port 8080
```

Open `http://localhost:8080`.

## Requirements

- Linux `x86_64` (or matching artifact architecture)
- Docker Engine running (required for Docker service views)

## Makefile Workflow

```bash
make help
make version
make build
make run PORT=8080
make package
```

`make package` now creates:
- `dist/dock-sight-linux-x86_64-vX.Y.Z.tar.gz` (versioned, from `backend/Cargo.toml`)

## Docker Service Grouping

Containers are grouped by label `com.docker.swarm.service.name`.
If missing, they are grouped as `standalone`.

## systemd (optional)

`ExecStart=/opt/dock-sight/dock-sight --port 8080`

## License

MIT. See [LICENSE](LICENSE).

