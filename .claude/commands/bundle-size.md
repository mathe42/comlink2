# Bundle Size Check

Check and analyze bundle size for performance optimization.

## Dependencies
- Builds the project
- Analyzes output bundle sizes
- Provides optimization suggestions

```bash
echo "📦 Building project for bundle analysis..."
npm run build
if [ -d "dist" ]; then
  echo -e "\n📊 Bundle size overview:"
  du -sh dist/
  echo -e "\n📈 Individual file sizes:"
  find dist -type f -name "*.js" -o -name "*.css" | while read file; do
    size=$(du -h "$file" | cut -f1)
    echo "$size - $file"
  done | sort -hr
  echo -e "\n💡 Optimization suggestions:"
  echo "- Consider code splitting for large bundles (>250KB)"
  echo "- Use tree shaking to remove unused code"
  echo "- Compress images and assets"
  echo "- Enable gzip compression in production"
else
  echo "⚠️  Build failed or no dist directory found"
fi
```