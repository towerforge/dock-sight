SHELL := /bin/bash

PORT ?= 8080

APP_NAME ?= dock-sight

BACKEND_DIR := backend
FRONTEND_DIR := frontend

BACKEND_BIN := $(BACKEND_DIR)/target/release/backend

DIST_DIR ?= dist

ARTIFACT ?= dock-sight-linux-x86_64.tar.gz

VERSION ?= $(shell sed -n 's/^version = "\(.*\)"/\1/p' $(BACKEND_DIR)/Cargo.toml | head -n1)
VERSION_TAG ?= v$(VERSION)

ARTIFACT_VERSIONED := dock-sight-linux-x86_64-$(VERSION_TAG).tar.gz

ENABLE_LATEST_ASSET ?= 0

.PHONY: help version dev-backend watch-backend dev-frontend build-frontend build-backend build run release package clean dist-clean

help:
	@echo "Dock Sight available targets"
	@echo ""
	@echo "  make version              Print detected version"
	@echo "  make dev-backend          Run backend in development mode"
	@echo "  make watch-backend        Run backend with cargo-watch"
	@echo "  make dev-frontend         Run frontend development server"
	@echo "  make build-frontend       Build frontend for production"
	@echo "  make build-backend        Build backend release binary"
	@echo "  make build                Build frontend and backend"
	@echo "  make run                  Run backend release binary"
	@echo "  make release              Alias for 'make build'"
	@echo "  make package              Build and create release artifact"
	@echo "  make clean                Clean backend build artifacts"
	@echo "  make dist-clean           Remove packaged artifacts"
	@echo ""
	@echo "Variables:"
	@echo "  PORT=<port>               Runtime port (default: 8080)"
	@echo "  VERSION=<x.y.z>           Override detected version"
	@echo "  DIST_DIR=<dir>            Output directory (default: dist)"
	@echo "  ENABLE_LATEST_ASSET=1     Also create unversioned artifact"
	@echo "  ARTIFACT=<name>           Unversioned artifact filename"

version:
	@echo $(VERSION)

dev-backend:
	cargo run --manifest-path $(BACKEND_DIR)/Cargo.toml -- --dev --port $(PORT)

watch-backend:
	cargo watch --manifest-path $(BACKEND_DIR)/Cargo.toml -x "run -- --dev --port $(PORT)"

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

build-frontend:
	cd $(FRONTEND_DIR) && pnpm install && pnpm build

build-backend:
	cargo build --manifest-path $(BACKEND_DIR)/Cargo.toml --release

build: build-frontend build-backend

release: build

run:
	./$(BACKEND_BIN) --port $(PORT)

package: build
	@if [ ! -f "$(BACKEND_BIN)" ]; then \
		echo "ERROR: backend binary not found"; \
		exit 1; \
	fi
	@mkdir -p $(DIST_DIR)
	@cp "$(BACKEND_BIN)" "$(DIST_DIR)/$(APP_NAME)"
	@chmod +x "$(DIST_DIR)/$(APP_NAME)"
	@tar -czf "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" -C "$(DIST_DIR)" "$(APP_NAME)"
	@if [ "$(ENABLE_LATEST_ASSET)" = "1" ]; then \
		cp "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" "$(DIST_DIR)/$(ARTIFACT)"; \
	fi
	@rm -f "$(DIST_DIR)/$(APP_NAME)"
	@echo "$(DIST_DIR)/$(ARTIFACT_VERSIONED)"

clean:
	cargo clean --manifest-path $(BACKEND_DIR)/Cargo.toml

dist-clean:
	rm -rf "$(DIST_DIR)"
