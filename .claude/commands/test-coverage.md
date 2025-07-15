# Test Coverage

Generate and display test coverage report.

## Dependencies
- Runs tests with coverage reporting
- Shows detailed coverage metrics

```bash
echo "📊 Generating test coverage report..."
npm run test -- --coverage --reporter=verbose
echo -e "\n📈 Coverage summary:"
if [ -d "coverage" ]; then
  echo "📁 Coverage report generated in coverage/ directory"
  echo "🌐 Open coverage/index.html in browser for detailed view"
else
  echo "⚠️  No coverage directory found - coverage may not be configured"
fi
```