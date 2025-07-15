# Check Dependencies

Analyze project dependencies for security and maintenance issues.

## Dependencies
- Checks for known vulnerabilities
- Identifies outdated packages
- Shows dependency tree for analysis

```bash
echo "🔍 Checking for vulnerable dependencies..."
npm audit
echo -e "\n📦 Checking for outdated packages..."
npm outdated
echo -e "\n🌳 Dependency tree analysis..."
npm ls --depth=1
echo -e "\n⚠️  Checking for duplicate dependencies..."
npm ls | grep -E "WARN|ERROR" || echo "✅ No duplicate dependencies found"
```