# CLI Overview

The Agora CLI provides powerful command-line tools for managing agents, deploying contracts, and interacting with the Agora network.

## Installation

Install the CLI globally:

```bash
npm install -g @agora/cli
```

Verify installation:

```bash
agora --version
```

## Quick Start

Configure the CLI:

```bash
agora config set api-key your-api-key
agora config set network testnet
```

Create your first agent:

```bash
agora agent create --name MyFirstAgent --capabilities bridge,swap
```

## Commands Overview

| Command | Description |
|---------|-------------|
| `agent` | Manage AI agents |
| `wallet` | Wallet operations |
| `bridge` | Cross-chain bridging |
| `profile` | Profile management |
| `config` | CLI configuration |
| `status` | Check network status |
| `logs` | View transaction logs |

## Global Options

These options work with any command:

```bash
agora [command] [options]

Options:
  -h, --help          Show help
  -v, --version       Show version
  --network <name>    Override network (mainnet, testnet, devnet)
  --json              Output as JSON
  --verbose           Verbose output
  --silent            Suppress output
```

## Configuration

The CLI stores configuration in `~/.agora/config.json`:

```json
{
  "apiKey": "your-api-key",
  "network": "testnet",
  "defaultAgent": "agent-123",
  "format": "table"
}
```

### View Configuration

```bash
agora config get
```

### Set Configuration

```bash
agora config set network mainnet
agora config set api-key new-api-key
```

## Environment Variables

You can also use environment variables:

```bash
export AGORA_API_KEY=your-api-key
export AGORA_NETWORK=testnet
export AGORA_DEFAULT_AGENT=agent-123
```

## Interactive Mode

Start interactive mode for a guided experience:

```bash
agora interactive
```

## Output Formats

Control output format with `--format`:

```bash
# Table format (default)
agora agent list --format table

# JSON format
agora agent list --format json

# YAML format
agora agent list --format yaml

# CSV format
agora agent list --format csv
```

## Shell Completion

Enable tab completion for your shell:

```bash
# Bash
agora completion bash >> ~/.bashrc

# Zsh
agora completion zsh >> ~/.zshrc

# Fish
agora completion fish > ~/.config/fish/completions/agora.fish
```

## Getting Help

Get help for any command:

```bash
# General help
agora --help

# Command help
agora agent --help

# Subcommand help
agora agent create --help
```

## Examples

### Create and Fund a Wallet

```bash
# Create wallet
agora wallet create --name MyWallet --chains ethereum,solana

# Get address
agora wallet address --name MyWallet

# Check balance
agora wallet balance --name MyWallet
```

### Bridge Assets

```bash
# Bridge USDC from Ethereum to Solana
agora bridge transfer \
  --from ethereum \
  --to solana \
  --token USDC \
  --amount 1000 \
  --wallet MyWallet
```

### Monitor Transactions

```bash
# Watch pending transactions
agora logs watch --status pending

# View recent transactions
agora logs list --limit 20
```

## Troubleshooting

### Connection Issues

```bash
# Check network status
agora status

# Test connection
agora status --test
```

### Debug Mode

Enable debug output:

```bash
agora [command] --verbose --debug
```

## Next Steps

- Learn about [CLI Commands](/cli/commands)
- Read about [CLI Configuration](/cli/configuration)
- See [Example Workflows](/examples/)
