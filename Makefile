SHELL := /bin/bash

PORT ?= 8080
ARTIFACT ?= dock-sight-linux-x86_64.tar.gz
BACKEND_BIN := backend/target/release/backend
VERSION ?= $(shell sed -n 's/^version = "\(.*\)"/\1/p' backend/Cargo.toml | head -n1)
VERSION_TAG ?= v$(VERSION)
ARTIFACT_VERSIONED := dock-sight-linux-x86_64-$(VERSION_TAG).tar.gz

.PHONY: help version dev-backend watch-backend dev-frontend build-frontend build-backend build run release package clean

help:
	@echo "Dock Sight Make targets"
	@echo ""
	@echo "  make version          Print detected app version from backend/Cargo.toml"
	@echo "  make dev-backend      Run backend in dev mode (--dev)"
	@echo "  make watch-backend    Run backend with cargo-watch in dev mode"
	@echo "  make dev-frontend     Run Astro frontend dev server"
	@echo "  make build-frontend   Build frontend (frontend/dist)"
	@echo "  make build-backend    Build backend release binary"
	@echo "  make build            Build frontend + backend release binary"
	@echo "  make run              Run release binary on PORT (default 8080)"
	@echo "  make release          Alias of 'make build'"
	@echo "  make package          Build + create release artifact tar.gz"
	@echo "  make clean            Remove backend build artifacts"
	@echo ""
	@echo "Variables:"
	@echo "  PORT=<port>           Runtime port for 'make run' (default: 8080)"
	@echo "  VERSION=<x.y.z>       Override version (default: read from backend/Cargo.toml)"
	@echo "  ARTIFACT=<name>       Stable artifact filename for latest download"

version:
	@echo $(VERSION)

dev-backend:
	cargo run --manifest-path backend/Cargo.toml -- --dev --port $(PORT)

watch-backend:
	cargo watch --manifest-path backend/Cargo.toml -x "run -- --dev --port $(PORT)"

dev-frontend:
	cd frontend && pnpm dev

build-frontend:
	cd frontend && pnpm install && pnpm build

build-backend:
	cargo build --manifest-path backend/Cargo.toml --release

build: build-frontend build-backend

release: build

run:
	./$(BACKEND_BIN) --port $(PORT)

package: build
	mkdir -p releases/latest/download
	cp backend/target/release/backend releases/latest/download/dock-sight
	chmod +x releases/latest/download/dock-sight
	tar -czf releases/latest/download/$(ARTIFACT_VERSIONED) -C releases/latest/download dock-sight
	tar -czf releases/latest/download/$(ARTIFACT) -C releases/latest/download dock-sight
	rm -f releases/latest/download/dock-sight
	@echo "Detected version: $(VERSION_TAG)"
	@echo "Created artifact: releases/latest/download/$(ARTIFACT_VERSIONED)"
	@echo "Created artifact: releases/latest/download/$(ARTIFACT)"

clean:
	cargo clean --manifest-path backend/Cargo.toml
