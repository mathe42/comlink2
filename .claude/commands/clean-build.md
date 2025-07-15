# Clean Build

Clean all build artifacts and perform a fresh build.

## Dependencies
- Removes dist, coverage, and test result directories
- Cleans npm cache
- Performs fresh build

```bash
echo "🧹 Cleaning build artifacts..."
echo -e "\n🗑️  Removing build directories..."
rm -rf dist/ coverage/ test-results/ playwright-report/
echo -e "\n🔄 Cleaning npm cache..."
npm cache clean --force
echo -e "\n📦 Reinstalling dependencies..."
rm -rf node_modules/
npm install
echo -e "\n🏗️  Fresh build..."
npm run build
echo -e "\n✅ Clean build completed!"
```