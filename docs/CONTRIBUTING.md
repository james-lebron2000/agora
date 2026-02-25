# Contributing to Agora

Thank you for your interest in contributing to Agora! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/agora.git
```
3. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Install root dependencies
npm install

# Install SDK dependencies
cd packages/sdk && npm install

# Install app dependencies
cd apps/agents && npm install
```

### Build

```bash
# Build everything
npm run build

# Build SDK only
npm run build:sdk

# Build agents only
npm run build:agents
```

### Testing

```bash
# Run all tests
cd packages/sdk && npm test

# Run tests in watch mode
npm test -- --watch
```

## Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Update documentation for API changes

## Commit Guidelines

We use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

Example:
```
feat(bridge): add support for Arbitrum bridging
```

## Pull Request Process

1. Update documentation for any API changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## Code of Conduct

Please read and follow our [Code of Conduct](/CODE_OF_CONDUCT).

## Questions?

- Join our [Discord](https://discord.gg/agora)
- Open a [GitHub Discussion](https://github.com/agora/agora/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
