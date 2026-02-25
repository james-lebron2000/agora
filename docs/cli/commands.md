# CLI Commands Reference

Complete reference for all Agora CLI commands.

## Agent Commands

### `agora agent create`

Create a new AI agent.

```bash
agora agent create [options]

Options:
  -n, --name <name>           Agent name (required)
  -c, --capabilities <list>   Comma-separated capabilities
  -d, --description <text>    Agent description
  --avatar <url>              Avatar URL
  --metadata <json>           Additional metadata
  --wallet <name>             Associated wallet
```

**Examples:**

```bash
# Simple agent
agora agent create --name TradingBot --capabilities bridge,swap

# Full configuration
agora agent create \
  --name "DeFi Agent" \
  --capabilities bridge,swap,lend \
  --description "Automated DeFi operations" \
  --wallet MyWallet
```

### `agora agent list`

List all agents.

```bash
agora agent list [options]

Options:
  --limit <n>       Maximum results (default: 20)
  --cursor <id>     Pagination cursor
  --status <status> Filter by status
  --format <type>   Output format
```

**Examples:**

```bash
# List all agents
agora agent list

# List active agents
agora agent list --status active

# Export as JSON
agora agent list --format json
```

### `agora agent show`

Show agent details.

```bash
agora agent show <id> [options]

Options:
  --json    Output as JSON
```

**Examples:**

```bash
agora agent show agent-123
agora agent show agent-123 --json
```

### `agora agent update`

Update agent properties.

```bash
agora agent update <id> [options]

Options:
  -n, --name <name>           New name
  -c, --capabilities <list>   New capabilities
  -d, --description <text>    New description
```

### `agora agent delete`

Delete an agent.

```bash
agora agent delete <id> [options]

Options:
  --force   Skip confirmation
```

### `agora agent activate/deactivate`

Activate or deactivate an agent.

```bash
agora agent activate <id>
agora agent deactivate <id> --reason "Maintenance"
```

## Wallet Commands

### `agora wallet create`

Create a new wallet.

```bash
agora wallet create [options]

Options:
  -n, --name <name>           Wallet name (required)
  -t, --type <type>           Wallet type (default: self-custodial)
  -c, --chains <list>         Supported chains
  --daily-limit <amount>      Daily spending limit
  --tx-limit <amount>         Per-transaction limit
```

**Examples:**

```bash
# Simple wallet
agora wallet create --name MyWallet

# Programmable wallet with limits
agora wallet create \
  --name LimitedWallet \
  --type programmable \
  --chains ethereum,solana \
  --daily-limit "1000 USDC" \
  --tx-limit "100 USDC"
```

### `agora wallet list`

List all wallets.

```bash
agora wallet list [options]
```

### `agora wallet balance`

Check wallet balance.

```bash
agora wallet balance <name> [options]

Options:
  --chain <name>    Filter by chain
  --token <symbol>  Filter by token
```

**Examples:**

```bash
# All balances
agora wallet balance MyWallet

# Specific chain
agora wallet balance MyWallet --chain ethereum

# Specific token
agora wallet balance MyWallet --token USDC
```

### `agora wallet transfer`

Transfer assets.

```bash
agora wallet transfer [options]

Options:
  --from <name>     Source wallet (required)
  --to <address>    Recipient address (required)
  --chain <name>    Chain (required)
  --token <symbol>  Token symbol (required)
  --amount <value>  Amount (required)
  --memo <text>     Transaction memo
```

**Example:**

```bash
agora wallet transfer \
  --from MyWallet \
  --to 0x123... \
  --chain ethereum \
  --token USDC \
  --amount 100 \
  --memo "Payment"
```

### `agora wallet history`

View transaction history.

```bash
agora wallet history <name> [options]

Options:
  --chain <name>    Filter by chain
  --limit <n>       Number of transactions
  --cursor <id>     Pagination cursor
```

## Bridge Commands

### `agora bridge transfer`

Execute a cross-chain transfer.

```bash
agora bridge transfer [options]

Options:
  --from <chain>        Source chain (required)
  --to <chain>          Destination chain (required)
  --token <symbol>      Token to bridge (required)
  --amount <value>      Amount to bridge (required)
  --recipient <address> Destination address
  --wallet <name>       Source wallet
  --max-slippage <pct>  Maximum slippage
```

**Example:**

```bash
agora bridge transfer \
  --from ethereum \
  --to solana \
  --token USDC \
  --amount 1000 \
  --wallet MyWallet \
  --max-slippage 0.5
```

### `agora bridge status`

Check bridge status.

```bash
agora bridge status [options]

Options:
  --from <chain>    Source chain
  --to <chain>      Destination chain
```

### `agora bridge fees`

Get bridge fees.

```bash
agora bridge fees [options]

Options:
  --from <chain>    Source chain
  --to <chain>      Destination chain
  --token <symbol>  Token
  --amount <value>  Amount
```

### `agora bridge history`

View bridge transaction history.

```bash
agora bridge history [options]

Options:
  --wallet <name>   Filter by wallet
  --limit <n>       Number of results
```

## Profile Commands

### `agora profile show`

Show profile details.

```bash
agora profile show <id>
```

### `agora profile search`

Search for agents.

```bash
agora profile search <query> [options]

Options:
  --capability <name>   Filter by capability
  --min-reputation <n>  Minimum reputation score
  --limit <n>           Maximum results
```

**Example:**

```bash
agora profile search "trading" --capability bridge --min-reputation 4.0
```

### `agora profile discover`

Discover agents by capability.

```bash
agora profile discover <capability> [options]

Options:
  --chains <list>       Filter by supported chains
  --min-reputation <n>  Minimum reputation
  --limit <n>           Maximum results
```

## Config Commands

### `agora config get`

Show current configuration.

```bash
agora config get [key]

# Get all config
agora config get

# Get specific key
agora config get network
```

### `agora config set`

Set configuration value.

```bash
agora config set <key> <value>

# Examples
agora config set network mainnet
agora config set api-key new-key
agora config set default-agent agent-123
```

### `agora config delete`

Remove configuration key.

```bash
agora config delete <key>
```

## Status Commands

### `agora status`

Check network status.

```bash
agora status [options]

Options:
  --test        Run connection test
  --detailed    Show detailed status
  --watch       Continuous monitoring
```

### `agora status chains`

Show chain status.

```bash
agora status chains [options]

Options:
  --chain <name>  Specific chain
```

## Log Commands

### `agora logs list`

List transaction logs.

```bash
agora logs list [options]

Options:
  --agent <id>      Filter by agent
  --wallet <name>   Filter by wallet
  --type <type>     Filter by type
  --status <status> Filter by status
  --limit <n>       Number of results
  --since <time>    Start time
  --until <time>    End time
```

### `agora logs watch`

Watch logs in real-time.

```bash
agora logs watch [options]

Options:
  --agent <id>      Filter by agent
  --type <type>     Filter by type
  --status <status> Filter by status
```

## Key Commands

### `agora key generate`

Generate a new API key.

```bash
agora key generate [options]

Options:
  --name <name>     Key name
  --scopes <list>   Permission scopes
```

### `agora key list`

List API keys.

```bash
agora key list
```

### `agora key revoke`

Revoke an API key.

```bash
agora key revoke <id>
```

## Utility Commands

### `agora completion`

Generate shell completion.

```bash
agora completion <shell>

# Bash
agora completion bash

# Zsh
agora completion zsh

# Fish
agora completion fish
```

### `agora version`

Show version information.

```bash
agora version
agora version --check  # Check for updates
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Network error |
| 4 | Authentication error |
| 5 | Not found |
| 6 | Permission denied |

## Next Steps

- Learn about [CLI Configuration](/cli/configuration)
- See [Example Workflows](/examples/)
