# Test Suite

Comprehensive test suite for the Sanity Image Resize Tool.

## Running Tests

```bash
# Install dependencies first
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Test Structure

```
tests/
├── unit/           # Unit tests for utility functions
│   └── utils.test.js
├── integration/    # End-to-end workflow tests
│   ├── resize-workflow.test.js
│   └── safety.test.js
└── fixtures/       # Test helpers and utilities
    └── test-helpers.js
```

## Test Categories

### Unit Tests
- Filename parsing
- Byte formatting
- Argument parsing

### Integration Tests
**Workflow Tests:**
- Complete tarball processing
- Image resizing accuracy
- Reference updates in data.ndjson
- Metadata updates in assets.json
- Aspect ratio preservation
- Quality settings
- Dry-run mode

**Safety Tests:**
- Original tarball preservation
- Temp directory cleanup
- Error handling
- Edge cases (special characters, small images, etc.)
- Re-processing already processed tarballs
- Format preservation

## Test Fixtures

The test suite creates temporary tarballs with realistic Sanity export structures:
- `images/` directory with properly named image files
- `assets.json` with asset metadata
- `data.ndjson` with document references

All temporary files are cleaned up after tests complete.

## Coverage

Run `pnpm test:coverage` to generate a coverage report. The report will be available in:
- Terminal output (text format)
- `coverage/` directory (HTML format)

## Timeouts

Integration tests have extended timeouts (30-60 seconds) because they:
- Generate test images
- Create/extract tarballs
- Process images with Sharp
- Validate results

## Safety

These tests are designed to validate that the tool is safe to use on production data:
- Verifies original files are never modified
- Ensures temp directories are cleaned up
- Tests error handling doesn't corrupt data
- Validates dry-run mode doesn't make changes
