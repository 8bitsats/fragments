# Enhanced Terminal Agent Features Guide

This guide covers the new advanced features added to your Gemini CLI terminal agent, including image generation, enhanced code execution, thinking capabilities, and structured output.

## 🎨 Image Generation

### Gemini Image Generation

Generate or edit images using Gemini 2.0 Flash Preview Image Generation:

```bash
# Text-to-image generation
gemini "Generate a futuristic cityscape with flying cars" --tool gemini_image_generation

# Image editing (provide base64 input image)
gemini "Add a rainbow to this landscape" --tool gemini_image_generation --input-image landscape.jpg

# Custom filename
gemini "Create a logo for a tech startup" --tool gemini_image_generation --filename startup-logo
```

**Parameters:**
- `prompt`: Description of the image to generate
- `inputImage`: Base64 encoded input image for editing (optional)
- `inputImageMimeType`: MIME type of input image (required if inputImage provided)
- `filename`: Output filename without extension

### Imagen Generation

Generate high-quality images using Google Imagen models:

```bash
# Generate multiple images
gemini "A photorealistic sunset over mountains" --tool imagen_generation --number-of-images 4

# Specific aspect ratio
gemini "Portrait of a person in a garden" --tool imagen_generation --aspect-ratio 3:4

# Control person generation
gemini "People at a beach party" --tool imagen_generation --person-generation allow_adult
```

**Parameters:**
- `prompt`: English text prompt (max 480 tokens)
- `numberOfImages`: 1-4 images (default: 4)
- `aspectRatio`: '1:1', '3:4', '4:3', '9:16', '16:9'
- `personGeneration`: 'dont_allow', 'allow_adult', 'allow_all'

## 💻 Enhanced Code Execution

### Multi-Language Support

Execute code with syntax highlighting and live editing:

```bash
# Python execution
gemini "Calculate fibonacci sequence" --tool enhanced_code_execution --language python --action execute

# Save and execute
gemini "Create a web scraper" --tool enhanced_code_execution --language python --action save_and_execute --filename scraper

# Format code
gemini "Clean up this messy code" --tool enhanced_code_execution --language javascript --action format
```

**Supported Languages:**
- Python, JavaScript, TypeScript
- Java, C++, C, Rust, Go
- Bash, Shell

**Actions:**
- `execute`: Run code directly
- `save`: Save to file
- `save_and_execute`: Save then run
- `format`: Format code
- `lint`: Check code quality

### Live Code Editor

Interactive vim-like code editor with syntax highlighting:

```bash
# Launch live editor
gemini --live-editor --language python --filename my_script.py
```

**Key Bindings:**
- `ESC`: Command mode
- `i`: Insert mode
- `w`: Save file
- `r`: Run code
- `q`: Quit editor

## 🧠 Thinking Capabilities

### Enhanced Function Calling

Use thinking capabilities for complex problem solving:

```bash
# Complex task with thinking
gemini "Analyze this dataset and create visualizations" --tool thinking_function_caller --thinking-budget 2048

# Multi-step workflow
gemini "Build a complete web application with tests" --tool thinking_function_caller --max-function-calls 15
```

**Parameters:**
- `task`: The problem to solve
- `thinkingBudget`: Thinking tokens (-1 for dynamic, 0 to disable)
- `includeThoughts`: Show reasoning process
- `maxFunctionCalls`: Limit function calls

### Reasoning Templates

```javascript
// Create complex reasoning prompts
const prompt = createReasoningPrompt(
  "Optimize database performance",
  "PostgreSQL database with 1M users",
  ["Must maintain data integrity", "Minimize downtime"]
);
```

## 📊 Structured Output

### JSON Generation

Generate structured JSON with schema validation:

```bash
# Extract data to JSON
gemini "Extract user data from this text" --tool structured_output --format json --schema person

# Custom schema
gemini "Parse product catalog" --tool structured_output --format json --save-to-file --filename products
```

### Multiple Formats

Support for various output formats:

```bash
# CSV export
gemini "Convert this data to CSV" --tool structured_output --format csv --include-headers

# Markdown documentation
gemini "Create API documentation" --tool structured_output --format markdown --filename api-docs

# YAML configuration
gemini "Generate config file" --tool structured_output --format yaml
```

**Supported Formats:**
- JSON (with schema validation)
- CSV (with custom delimiters)
- YAML, XML, Markdown, HTML

## 🔧 Integration Examples

### Complete Workflow Example

```bash
# 1. Generate a complex application
gemini "Create a task management web app with the following features:
- User authentication
- Task CRUD operations
- Real-time updates
- Data visualization
Use thinking to plan the architecture and implementation." \
--tool thinking_function_caller \
--thinking-budget -1 \
--include-thoughts true \
--max-function-calls 20

# 2. Generate images for the app
gemini "Create a modern logo for a task management app" \
--tool imagen_generation \
--aspect-ratio 1:1 \
--filename task-app-logo

# 3. Extract structured data
gemini "Create a JSON schema for task objects with validation" \
--tool structured_output \
--format json \
--save-to-file \
--filename task-schema
```

### API Integration

```javascript
// Using the tools programmatically
import { GeminiImageGenerationTool, StructuredOutputTool } from '@gemini-cli/core';

// Generate image
const imageResult = await imageGenTool.execute({
  prompt: "Product mockup for mobile app",
  filename: "mockup"
});

// Extract structured data
const dataResult = await structuredTool.execute({
  prompt: "Parse this user feedback into structured data",
  format: "json",
  schema: CommonSchemas.feedback
});
```

## 🚀 Performance Optimization

### Context Management

For large projects, use long context capabilities:

```bash
# Process large codebases
gemini "Analyze this entire repository for security vulnerabilities" \
--tool read_many_files \
--paths "**/*.js" "**/*.ts" "**/*.py" \
--max-context 1000000

# Multi-document analysis
gemini "Compare these research papers and create a summary" \
--tool thinking_function_caller \
--context "Academic research analysis" \
--thinking-budget 4096
```

### Caching and Optimization

```bash
# Enable context caching for repeated operations
export GEMINI_CONTEXT_CACHE=true

# Use appropriate models for different tasks
gemini "Simple text processing" --model gemini-2.5-flash
gemini "Complex reasoning task" --model gemini-2.5-pro
```

## 🔒 Security Considerations

### Code Execution Safety

All code execution requires confirmation unless auto-approved:

```bash
# Safe execution with confirmation
gemini "Run this system diagnostic script" --tool enhanced_code_execution --confirm

# Auto-approve for trusted operations
gemini --approval-mode yolo "Run unit tests"
```

### Input Validation

All tools include parameter validation:

```javascript
// Example validation in tools
validateParams(params) {
  if (!params.code.trim()) {
    return 'Code content cannot be empty';
  }
  if (params.language === 'bash' && params.code.includes('rm -rf')) {
    return 'Potentially dangerous command detected';
  }
  return null;
}
```

## 📈 Advanced Usage Patterns

### Compositional Workflows

Chain multiple tools for complex tasks:

```bash
# 1. Research and gather information
gemini "Research best practices for React performance" --tool web_search

# 2. Generate code based on research
gemini "Create optimized React components using the research findings" --tool enhanced_code_execution

# 3. Generate documentation
gemini "Create comprehensive documentation for these components" --tool structured_output --format markdown

# 4. Create visual examples
gemini "Generate UI mockups showing the components in use" --tool imagen_generation
```

### Batch Processing

Process multiple items efficiently:

```bash
# Process multiple images
for img in *.jpg; do
  gemini "Generate a description for this image: $img" --tool imagen_generation --input-image "$img"
done

# Bulk data processing
gemini "Process all CSV files in this directory and extract insights" --tool thinking_function_caller --context "Data analysis workflow"
```

## 🛠️ Configuration

### Environment Setup

```bash
# Required environment variables
export GEMINI_API_KEY="your-api-key"
export GEMINI_MODEL="gemini-2.5-pro"  # or gemini-2.5-flash
export GEMINI_THINKING_BUDGET="-1"    # Dynamic thinking
export GEMINI_MAX_CONTEXT="1000000"   # 1M token context
```

### Tool Configuration

```javascript
// Configure tools in your gemini CLI config
{
  "tools": {
    "enhanced_code_execution": {
      "default_language": "python",
      "auto_install_deps": false,
      "syntax_theme": "dark"
    },
    "image_generation": {
      "default_aspect_ratio": "1:1",
      "save_location": "./generated_images/"
    },
    "structured_output": {
      "default_format": "json",
      "pretty_print": true,
      "auto_save": false
    }
  }
}
```

## 📚 API Reference

### Tool Names and Parameters

| Tool | Name | Key Parameters |
|------|------|----------------|
| Gemini Image Gen | `gemini_image_generation` | prompt, inputImage, filename |
| Imagen Gen | `imagen_generation` | prompt, numberOfImages, aspectRatio |
| Enhanced Code | `enhanced_code_execution` | language, code, action |
| Thinking Caller | `thinking_function_caller` | task, thinkingBudget, maxFunctionCalls |
| Structured Output | `structured_output` | prompt, format, schema |

### Response Formats

All tools return consistent response formats:

```javascript
{
  llmContent: "Content for LLM context",
  returnDisplay: "Formatted display for user"
}
```

## 🎯 Best Practices

1. **Use appropriate models**: Flash for speed, Pro for complex reasoning
2. **Structure your prompts**: Be specific about desired outputs
3. **Leverage thinking**: Use thinking budget for complex problems
4. **Validate outputs**: Always check generated code before execution
5. **Save important outputs**: Use `saveToFile` for persistent results
6. **Chain operations**: Combine tools for powerful workflows

## 🐛 Troubleshooting

### Common Issues

1. **API Rate Limits**: Use appropriate delays between requests
2. **Token Limits**: Break large tasks into smaller chunks
3. **Code Execution Errors**: Check language syntax and dependencies
4. **Image Generation Failures**: Verify prompts meet content policies

### Debug Mode

```bash
# Enable debug logging
gemini --debug "your command here"

# Verbose output
gemini --verbose "analyze this complex problem"
```

This enhanced terminal agent now provides comprehensive capabilities for image generation, code execution, thinking-based reasoning, and structured output generation, making it a powerful tool for development, analysis, and creative tasks.