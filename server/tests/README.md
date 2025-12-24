# Backend Tests

This directory contains unit tests for the Flask backend.

## Setup

Install test dependencies:

```bash
pip install -r requirements-test.txt
```

## Running Tests

Run all tests:

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=src --cov-report=html
```

Run specific test file:

```bash
pytest tests/test_character_service.py
```

Run specific test:

```bash
pytest tests/test_character_service.py::TestCharacterService::test_record_characters_predefined
```

## Test Structure

- `conftest.py`: Pytest configuration and shared fixtures
- `test_*.py`: Test files for each module
- Tests follow the naming convention: `test_<module_name>.py`

## Writing Tests

1. Create test files in the `tests/` directory
2. Use descriptive test names starting with `test_`
3. Use fixtures from `conftest.py` for common setup
4. Mock external dependencies (AI services, databases, etc.)

## Coverage

Target coverage: 80%+

View coverage report:

```bash
# HTML report
pytest --cov=src --cov-report=html
# Open htmlcov/index.html in browser

# Terminal report
pytest --cov=src --cov-report=term-missing
```

