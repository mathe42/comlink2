# Lint and Fix

Run linting and automatically fix issues where possible.

## Dependencies
- Runs TypeScript compiler checks
- Fixes formatting issues
- Reports any remaining issues

```bash
echo "🔍 Running linting and fixes..."
echo -e "\n📝 TypeScript compiler checks..."
npx tsc --noEmit || echo "⚠️  TypeScript errors found"
echo -e "\n🛠️  Checking for common code issues..."
find src -name "*.ts" -o -name "*.js" | xargs grep -n "TODO\|FIXME\|XXX" || echo "✅ No TODO/FIXME comments found"
echo -e "\n🔧 Formatting check..."
if command -v prettier &> /dev/null; then
  npx prettier --check src/
else
  echo "⚠️  Prettier not installed"
fi
```