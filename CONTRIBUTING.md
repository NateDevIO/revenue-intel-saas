# Contributing to SaaS Revenue Lifecycle Analyzer

## Code Quality Standards

This project maintains high code quality through automated tooling and consistent formatting.

### Frontend (TypeScript/Next.js)

#### ESLint
- **Purpose**: Catch bugs and enforce code quality rules
- **Config**: Extends Next.js recommended config
- **Run**: `npm run lint`
- **Fix**: `npm run lint:fix`

#### Prettier
- **Purpose**: Automatic code formatting
- **Config**: `.prettierrc` (100 char line length, 2 space tabs, semicolons)
- **Run**: `npm run format` (format all files)
- **Check**: `npm run format:check` (check without modifying)

#### Pre-commit Hooks (Husky + lint-staged)
When git is initialized, Husky will automatically:
- Run ESLint and Prettier on staged files before commit
- Ensure all committed code is formatted and passes linting

**To set up git hooks** (after initializing git repository):
```bash
cd frontend
npm run prepare
```

### Backend (Python/FastAPI)

#### Black
- **Purpose**: Uncompromising Python code formatter
- **Config**: `pyproject.toml` (100 char line length)
- **Run**: `black .` (from backend directory)

#### isort
- **Purpose**: Sort and organize Python imports
- **Config**: `pyproject.toml` (compatible with Black)
- **Run**: `isort .` (from backend directory)

#### Flake8
- **Purpose**: Linting and style guide enforcement (PEP 8)
- **Config**: `.flake8` (100 char line length, ignores E203/W503 for Black compatibility)
- **Run**: `flake8 .` (from backend directory)

**Quick format & lint script**:
```bash
cd backend
bash format.sh
```

## Development Workflow

### Before Committing

**Frontend:**
```bash
cd frontend
npm run lint:fix
npm run format
```

**Backend:**
```bash
cd backend
black .
isort .
flake8 .
```

### Recommended IDE Setup

#### VS Code
Install extensions:
- ESLint
- Prettier - Code formatter
- Python (with Black formatter)

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  },
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true
}
```

## Testing

### Frontend
```bash
cd frontend
npm run test           # Run tests once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### Backend
(Tests to be added)

## Pull Request Guidelines

1. **Code Quality**: All code must pass linting and formatting checks
2. **Testing**: Add tests for new features
3. **Documentation**: Update README/docs for significant changes
4. **Commits**: Use clear, descriptive commit messages
5. **Review**: Request review before merging

## Code Style Guidelines

### TypeScript/React
- Use functional components with hooks
- Prefer named exports for components
- Use TypeScript strict mode
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks

### Python
- Follow PEP 8 (enforced by Flake8)
- Use type hints for function signatures
- Write docstrings for public functions/classes
- Keep functions focused and testable
- Prefer explicit over implicit

## Questions?

Open an issue or reach out to the maintainers.
