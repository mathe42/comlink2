# Performance Analysis

Analyze build performance and bundle size for optimization opportunities.

## Dependencies
- Analyzes build performance
- Checks bundle size
- Identifies optimization opportunities

```bash
echo "🚀 Running performance analysis..."
echo -e "\n📊 Building and analyzing bundle size..."
npm run build
if [ -d "dist" ]; then
  echo -e "\n📦 Bundle size analysis:"
  du -sh dist/*
  echo -e "\n📈 Detailed file sizes:"
  find dist -name "*.js" -o -name "*.css" | xargs ls -lh
else
  echo "⚠️  No dist directory found"
fi
echo -e "\n⚡ Build time analysis..."
time npm run build
echo -e "\n🔍 Checking for potential performance issues..."
find src -name "*.ts" -o -name "*.js" | xargs grep -n "console\.\|debugger\|alert(" || echo "✅ No debug statements found"
```