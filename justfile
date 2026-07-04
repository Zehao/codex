set working-directory := "codex-rs"
set positional-arguments

# Show available app-server focused commands.
help:
    just -l

# Run the standalone app-server binary.
app-server *args:
    cargo run -p codex-app-server --bin codex-app-server -- {args}

# Check the app-server and its dependency closure.
check:
    cargo check -p codex-app-server

# Build the app-server binary.
build:
    cargo build -p codex-app-server --bin codex-app-server

# Run app-server tests only.
test:
    cargo test -p codex-app-server
