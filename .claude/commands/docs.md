# Generate Documentation

Generate markdown documentation for a specific TypeScript file. Creates a `.md` file in the same directory as the source file using Claude's analysis.

## Usage

This command analyzes a TypeScript file and generates comprehensive documentation including:
- Exported functions, types, and interfaces
- Function signatures with parameters and return types
- JSDoc comments if present
- Usage examples
- File metadata

## Dependencies
- Claude AI for intelligent code analysis

```bash
echo "📝 Generating documentation with Claude..."

# Get the target file from user input
TARGET_FILE="$1"

if [ -z "$TARGET_FILE" ]; then
  echo "❌ Error: Please provide a file path"
  echo "Usage: /docs path/to/file.ts"
  exit 1
fi

# Check if file exists
if [ ! -f "$TARGET_FILE" ]; then
  echo "❌ Error: File '$TARGET_FILE' does not exist"
  exit 1
fi

echo "🔍 Analyzing file: $TARGET_FILE"
echo "📚 Claude will now generate intelligent documentation for this file..."
echo "✅ Ready to generate documentation!"
```