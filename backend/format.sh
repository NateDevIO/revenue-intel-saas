#!/bin/bash

# Format Python code with Black and isort
echo "Running Black formatter..."
black .

echo "Running isort..."
isort .

echo "Running Flake8 linter..."
flake8 .

echo "Code formatting and linting complete!"
