# Project Info

Display comprehensive project information and health status.

## Dependencies
- Shows project structure and key files
- Displays npm scripts and dependencies
- Provides quick project overview

```bash
echo "📋 Project Information"
echo "===================="
echo -e "\n📁 Project structure:"
tree -I 'node_modules|dist|coverage|test-results|playwright-report' -L 2 2>/dev/null || find . -type d -not -path "./node_modules*" -not -path "./dist*" -not -path "./coverage*" | head -20
echo -e "\n📦 Package info:"
if [ -f "package.json" ]; then
  echo "Name: $(grep '"name"' package.json | cut -d'"' -f4)"
  echo "Version: $(grep '"version"' package.json | cut -d'"' -f4)"
  echo "Description: $(grep '"description"' package.json | cut -d'"' -f4)"
fi
echo -e "\n🔧 Available scripts:"
npm run 2>&1 | grep -E "^  [a-z-]+" || echo "No custom scripts found"
echo -e "\n📊 Project stats:"
echo "TypeScript files: $(find src -name "*.ts" 2>/dev/null | wc -l)"
echo "Test files: $(find tests -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l)"
echo "Total lines of code: $(find src -name "*.ts" -o -name "*.js" 2>/dev/null | xargs wc -l | tail -1 | awk '{print $1}' || echo "0")"
```