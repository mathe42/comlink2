# Development Setup

Set up the development environment and check all dependencies.

## Dependencies
- Installs all npm dependencies
- Verifies TypeScript configuration
- Runs initial build to ensure everything works

```bash
echo "🚀 Setting up development environment..."
echo -e "\n📦 Installing dependencies..."
npm install
echo -e "\n🔧 Verifying TypeScript configuration..."
npx tsc --noEmit
echo -e "\n🏗️  Running initial build..."
npm run build
echo -e "\n✅ Development setup complete!"
echo "Run 'npm run dev' to start development server"
```