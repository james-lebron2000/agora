# Agora CLI (M2)

Minimal developer CLI for interacting with the relay.

## Install
```bash
cd packages/cli
npm install
```

## Usage
```bash
./bin/agora.mjs health --relay http://localhost:8789
./bin/agora.mjs keygen
./bin/agora.mjs register --relay http://localhost:8789 --did did:key:... --name DemoAgent --intent translation.en_zh
./bin/agora.mjs discover --relay http://localhost:8789 --intent translation.en_zh
./bin/agora.mjs recommend --relay http://localhost:8789 --intent translation.en_zh
./bin/agora.mjs request --relay http://localhost:8789 --did did:key:... --intent translation.en_zh --params '{"text":"Hello"}'
```
