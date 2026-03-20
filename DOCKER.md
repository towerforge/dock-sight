# Dock Sight

![Dock Sight demo](https://raw.githubusercontent.com/towerforge/dock-sight/main/demo.gif)

Lightweight infrastructure dashboard for Docker hosts — monitor CPU, RAM, disk, network and Docker services from your browser.

- Real-time host metrics (CPU, RAM, disk, network)
- Docker services and container status
- Single binary, no runtime dependencies
- Supports `amd64` and `arm64`

## Quick start

```bash
docker run -d \
  --name dock-sight \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  towerforge/dock-sight:latest
```

Open [http://localhost:8080](http://localhost:8080)

## Docker Compose

```yaml
services:
  dock-sight:
    image: towerforge/dock-sight:latest
    container_name: dock-sight
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## Custom port

Map any host port to the internal `8080`:

```bash
docker run -d \
  --name dock-sight \
  --restart unless-stopped \
  -p 9090:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  towerforge/dock-sight:latest
```

Then open [http://localhost:9090](http://localhost:9090)

## Docker Swarm

Containers are automatically grouped by the label `com.docker.swarm.service.name`. Containers without this label are listed under `standalone`.

## Security note

Mounting `/var/run/docker.sock` gives the container read access to the Docker daemon. Run it on trusted networks only and avoid exposing the port publicly.

## Source

[github.com/towerforge/dock-sight](https://github.com/towerforge/dock-sight)
