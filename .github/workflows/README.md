# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### `ci.yml` - Continuous Integration
Runs on every push and pull request to `main` and `develop` branches.

Frontend jobs use **Node.js 20** (see `package.json` `engines` for the Vite 7 minimum; currently **20.19+** or **22.12+**).

Backend jobs use **Python 3.11**. Do not downgrade (e.g. to 3.9): `server/requirements.txt` pins `langchain-core` 1.x, which requires **Python 3.10+**.

**Jobs:**
- **type-check**: TypeScript type checking
- **frontend-test**: Frontend unit tests (Vitest)
- **backend-lint**: Python code linting (flake8)
- **backend-test**: Python unit tests (pytest) with coverage
- **rust-check**: Rust code checking for Tauri backend

### `build.yml` - Build and Release
Runs on tag pushes (v*) and manual workflow dispatch.

**Features:**
- Builds the application for multiple platforms (Linux, Windows, macOS)
- Creates GitHub releases with build artifacts
- Uses Tauri Action for cross-platform builds

## Setup

### Required Secrets
No secrets required for basic CI. For releases, `GITHUB_TOKEN` is automatically provided.

### Environment Variables
- None required for basic workflows

## Usage

### Running CI
CI runs automatically on push/PR. To run manually:
1. Go to Actions tab in GitHub
2. Select the workflow
3. Click "Run workflow"

### Creating a Release
1. Create and push a tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
2. The build workflow will automatically trigger
3. Build artifacts will be attached to a draft release

