# Test All

Run all tests (unit and e2e) with comprehensive reporting.

## Dependencies
- Runs unit tests with Vitest
- Runs e2e tests with Playwright
- Generates coverage reports
- Try to fix all failing tests.

```bash
echo "🧪 Running all tests..."
echo -e "\n📊 Running unit tests..."
npm run test:unit
echo -e "\n🎭 Running e2e tests..."
npm run test:e2e
echo -e "\n📈 Test coverage summary:"
npm run test -- --coverage 2>/dev/null || echo "⚠️  Coverage not configured"
echo -e "\n✅ All tests completed!"
```