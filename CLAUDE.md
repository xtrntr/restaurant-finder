# CLAUDE.md - Project Guidelines

## Build & Test Commands
- Build: `npm run build` or `make build`
- Lint: `npm run lint` or `make lint`
- Test (all): `npm test` or `make test`
- Test (single): `npm test -- -t "test name"` or `jest path/to/test.js`
- Type check: `npm run typecheck` or `tsc --noEmit`

## Code Style Guidelines
- **Formatting**: Use consistent indentation (2 spaces preferred)
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Imports**: Group imports (standard library, external, internal)
- **Types**: Use strong typing (TypeScript/Flow preferred)
- **Error Handling**: Always catch and properly log errors
- **Comments**: Document complex logic, public APIs, and non-obvious behaviors
- **Testing**: Write unit tests for all new functionality
- **Git**: Descriptive commit messages, meaningful PR titles

_Note: This file will be updated as project conventions are established._