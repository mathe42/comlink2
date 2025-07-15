# Security Audit

Perform a comprehensive security audit of the codebase.

## Dependencies
- Runs npm audit to check for known vulnerabilities
- Checks for outdated packages that may have security issues
- Analyzes TypeScript configurations for security best practices

```bash
echo "🔍 Running security audit..."
npm audit --audit-level=moderate
echo -e "\n📦 Checking for outdated packages..."
npm outdated
echo -e "\n🔧 Checking TypeScript security configurations..."
if [ -f "tsconfig.json" ]; then
  echo "✅ TypeScript config found"
  grep -n "strict\|noImplicitAny\|noImplicitReturns" tsconfig.json || echo "⚠️  Consider enabling strict mode flags"
else
  echo "⚠️  No TypeScript config found"
fi
echo -e "\n🔍 Scanning for potential security issues in source code..."
find src -name "*.ts" -o -name "*.js" | xargs grep -n "eval\|innerHTML\|document.write\|setTimeout.*string\|setInterval.*string" || echo "✅ No obvious security anti-patterns found"
```