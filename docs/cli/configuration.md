# CLI Configuration

This guide covers all configuration options for the Agora CLI.

## Configuration File

The CLI stores configuration in `~/.agora/config.json`:

```json
{
  "apiKey": "ag_live_xxxxxxxx",
  "network": "testnet",
  "defaultAgent": "agent-123",
  "defaultWallet": "MyWallet",
  "format": "table",
  "verbose": false,
  "timeout": 30000,
  "retries": 3
}
```

## Configuration Methods

Configuration can be set via (in order of precedence):

1. **Command-line flags** - Highest priority
2. **Environment variables** - Second priority
3. **Config file** - Third priority
4. **Defaults** - Lowest priority

## Core Settings

### API Key

Your Agora API key for authentication.

```bash
# Config file
agora config set api-key your-api-key

# Environment variable
export AGORA_API_KEY=your-api-key

# Command flag
agora [command] --api-key your-api-key
```

### Network

The network to connect to.

| Network | Description |
|---------|-------------|
| `mainnet` | Production network |
| `testnet` | Test network |
| `devnet` | Local development |

```bash
agora config set network testnet
export AGORA_NETWORK=testnet
```

### Default Agent

Set a default agent for commands.

```bash
agora config set default-agent agent-123
export AGORA_DEFAULT_AGENT=agent-123
```

### Default Wallet

Set a default wallet for transactions.

```bash
agora config set default-wallet MyWallet
export AGORA_DEFAULT_WALLET=MyWallet
```

## Output Settings

### Format

Default output format.

```bash
agora config set format json
```

Options: `table`, `json`, `yaml`, `csv`

### Verbosity

Control output verbosity.

```bash
agora config set verbose true
export AGORA_VERBOSE=true
```

Levels:
- `silent` - No output
- `error` - Errors only
- `warn` - Warnings and errors
- `info` - Standard output (default)
- `verbose` - Detailed output
- `debug` - Debug information

### Colors

Enable/disable colored output.

```bash
agora config set colors true
export AGORA_COLORS=true
```

## Connection Settings

### Timeout

Request timeout in milliseconds.

```bash
agora config set timeout 60000
export AGORA_TIMEOUT=60000
```

### Retries

Number of retry attempts for failed requests.

```bash
agora config set retries 5
export AGORA_RETRIES=5
```

### Relay Endpoints

Custom relay endpoints.

```bash
agora config set relays https://relay1.agora.network,https://relay2.agora.network
```

## Security Settings

### Key Storage

Configure how private keys are stored.

```json
{
  "keyStorage": {
    "type": "file",
    "path": "~/.agora/keys",
    "encryption": "aes-256-gcm"
  }
}
```

Options:
- `file` - Encrypted file storage
- `keychain` - OS keychain (macOS)
- `secret-service` - Linux secret service
- `pass` - Pass password store

### Auto-Confirm

Automatically confirm transactions (use with caution).

```bash
agora config set auto-confirm false
```

### Confirm Threshold

Amount above which to require confirmation.

```bash
agora config set confirm-threshold "1000 USDC"
```

## Advanced Settings

### Cache

Configure caching behavior.

```json
{
  "cache": {
    "enabled": true,
    "directory": "~/.agora/cache",
    "ttl": 300,
    "maxSize": "100MB"
  }
}
```

### Logging

Configure log output.

```json
{
  "logging": {
    "enabled": true,
    "level": "info",
    "file": "~/.agora/logs/cli.log",
    "maxSize": "10MB",
    "maxFiles": 5
  }
}
```

### Proxy

Configure HTTP proxy.

```bash
agora config set proxy http://proxy.example.com:8080
export AGORA_PROXY=http://proxy.example.com:8080
```

### SSL/TLS

SSL certificate verification.

```bash
agora config set verify-ssl true
```

For development with self-signed certificates:

```bash
agora config set verify-ssl false
# WARNING: Only for development!
```

## Profiles

Manage multiple configuration profiles.

### Create Profile

```bash
agora config profile create production
agora config set --profile production network mainnet
agora config set --profile production api-key prod-key
```

### Switch Profile

```bash
agora config profile use production
export AGORA_PROFILE=production
```

### List Profiles

```bash
agora config profile list
```

### Delete Profile

```bash
agora config profile delete production
```

## Environment-Specific Configuration

### Development

```bash
export AGORA_NETWORK=devnet
export AGORA_VERBOSE=true
export AGORA_DEBUG=true
```

### Staging

```bash
export AGORA_NETWORK=testnet
export AGORA_VERBOSE=true
export AGORA_LOG_LEVEL=debug
```

### Production

```bash
export AGORA_NETWORK=mainnet
export AGORA_VERBOSE=false
export AGORA_AUTO_CONFIRM=false
export AGORA_KEY_STORAGE=keychain
```

## Complete Configuration Example

```json
{
  "apiKey": "ag_live_xxxxxxxx",
  "network": "mainnet",
  "defaultAgent": "agent-123",
  "defaultWallet": "MainWallet",
  "format": "table",
  "verbose": false,
  "colors": true,
  "timeout": 30000,
  "retries": 3,
  "autoConfirm": false,
  "confirmThreshold": "1000 USDC",
  "keyStorage": {
    "type": "keychain"
  },
  "cache": {
    "enabled": true,
    "ttl": 300
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "file": "~/.agora/logs/cli.log"
  },
  "profiles": {
    "development": {
      "network": "devnet",
      "verbose": true
    },
    "staging": {
      "network": "testnet",
      "verbose": true
    }
  }
}
```

## Configuration Commands

### View Configuration

```bash
# View all
agora config get

# View specific key
agora config get network

# View profile config
agora config get --profile development
```

### Set Configuration

```bash
agora config set <key> <value>
```

### Delete Configuration

```bash
agora config delete <key>
```

### Reset Configuration

```bash
# Reset all to defaults
agora config reset

# Reset specific key
agora config reset <key>
```

### Validate Configuration

```bash
agora config validate
```

## Troubleshooting

### Configuration Not Applied

1. Check for environment variables overriding config
2. Verify config file permissions
3. Check for syntax errors in JSON

### Reset to Defaults

```bash
rm ~/.agora/config.json
agora config init
```

## Next Steps

- Read [CLI Commands Reference](/cli/commands)
- See [Example Workflows](/examples/)
