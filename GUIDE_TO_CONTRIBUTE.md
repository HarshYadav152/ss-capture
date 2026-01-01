# Contributing to SS-Capture

Thank you for your interest in contributing to SS-Capture! We welcome contributions from everyone. This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Git**
- A modern browser (Chrome, Firefox, or Edge)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/HarshYadav152/ss-capture.git
   cd ss-capture
   cd ss-capture
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/HarshYadav152/ss-capture.git
   ```

## 🛠️ Development Setup

### Installation

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Validate the build
npm run validate
```

### Load Extension in Browser

#### Chrome/Edge
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/chrome` (or `dist/edge`) folder

#### Firefox
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the `dist/firefox` folder

### Development Workflow

```bash
# Make changes in the src/ directory
# Then rebuild
npm run build

# Run tests
npm test

# Validate your changes
npm run validate
```

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

#### 🐛 Bug Fixes
- Fix existing issues
- Improve error handling
- Enhance browser compatibility

#### ✨ New Features
- Add new screenshot options (quality, format)
- Implement new UI features
- Add browser-specific enhancements

#### 📖 Documentation
- Improve README or guides
- Add code comments
- Create tutorials or examples

#### 🧪 Tests
- Add unit tests
- Improve test coverage
- Create integration tests

#### 🎨 UI/UX Improvements
- Enhance the popup design
- Improve user experience
- Add animations or transitions

#### 🌐 Internationalization
- Add translations
- Improve localization support

## 🔄 Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes** in the `src/` directory

4. **Build and test**:
   ```bash
   npm run build
   npm test
   npm run validate
   ```

5. **Test manually** in all supported browsers

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-jpeg-export`)
- `fix/` - Bug fixes (e.g., `fix/chunk-stitching-error`)
- `docs/` - Documentation updates (e.g., `docs/improve-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/content-script`)
- `test/` - Test additions/improvements (e.g., `test/add-unit-tests`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(popup): add JPEG export option
fix(content): resolve chunk stitching alignment issue
docs(readme): update installation instructions
refactor(background): simplify message routing
test(content): add unit tests for chunk calculation
```

### Submitting the Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title following commit message format
   - Detailed description of changes
   - Reference to related issues (e.g., "Fixes #123")
   - Screenshots for UI changes
   - List of browsers tested

3. **PR Template** (use this structure):
   ```markdown
   ## Description
   Brief description of what this PR does.

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Code refactoring
   - [ ] Test improvements

   ## Related Issues
   Fixes #(issue number)

   ## How Has This Been Tested?
   - [ ] Chrome (version: X)
   - [ ] Firefox (version: Y)
   - [ ] Edge (version: Z)

   ## Screenshots (if applicable)
   Add screenshots here

   ## Checklist
   - [ ] My code follows the project's coding standards
   - [ ] I have performed a self-review
   - [ ] I have commented my code where necessary
   - [ ] I have updated the documentation
   - [ ] My changes generate no new warnings
   - [ ] I have added tests that prove my fix/feature works
   - [ ] All tests pass locally
   ```

### Review Process

1. Maintainers will review your PR within **3-5 business days**
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release!

## 💻 Coding Standards

### JavaScript Style

```javascript
// Use ES6+ features
const capture = async () => {
  // Async/await for asynchronous operations
  const result = await captureScreen();
  return result;
};

// Use descriptive variable names
const totalChunks = Math.ceil(pageHeight / CHUNK_HEIGHT);

// Add comments for complex logic
// Calculate chunk boundaries to handle pages > 32,000px
const chunkStart = i * CHUNK_HEIGHT;
const chunkEnd = Math.min((i + 1) * CHUNK_HEIGHT, pageHeight);

// Use consistent error handling
try {
  await performCapture();
} catch (error) {
  console.error('Capture failed:', error);
  showErrorAlert(error.message);
}
```

### HTML/CSS Guidelines

```css
/* Use BEM naming convention for classes */
.popup__button--primary { }
.popup__progress-bar { }

/* Use CSS custom properties for theming */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
}

/* Mobile-first responsive design */
.container {
  width: 100%;
}

@media (min-width: 768px) {
  .container {
    width: 400px;
  }
}
```

### Code Organization

- Keep functions small and focused (< 50 lines)
- Use meaningful function and variable names
- Avoid deep nesting (max 3 levels)
- Group related functionality together
- Add JSDoc comments for complex functions:

```javascript
/**
 * Captures a screenshot of the specified page region
 * @param {number} startY - Starting Y coordinate
 * @param {number} height - Height of the capture region
 * @returns {Promise<string>} Base64 encoded image data
 */
async function captureRegion(startY, height) {
  // Implementation
}
```

## 🧪 Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Short pages (< 5,000px height)
- [ ] Medium pages (5,000-32,000px height)
- [ ] Very long pages (> 32,000px height)
- [ ] Pages with fixed headers/footers
- [ ] Pages with lazy-loaded content
- [ ] Canceling mid-capture
- [ ] Error scenarios (timeout, restricted pages)
- [ ] All supported browsers (Chrome, Firefox, Edge)
- [ ] UI responsiveness
- [ ] Progress bar accuracy

### Writing Tests

Add tests for new functionality:

```javascript
// tests/your-feature.test.js
describe('Your Feature', () => {
  test('should perform expected behavior', () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = yourFunction(input);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

Run tests:
```bash
npm test
```

## 🐛 Reporting Bugs

### Before Reporting

1. **Check existing issues** to avoid duplicates
2. **Test on latest version** of the extension
3. **Try different browsers** to isolate the issue

### Bug Report Template

Use the following template when reporting bugs:

```markdown
**Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Extension Version: [e.g., 1.0.0]
- Page URL (if public): [URL]

**Console Errors**
Any errors from the browser console.

**Additional Context**
Any other relevant information.
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Use Cases**
Who would benefit from this feature and how?

**Additional context**
Mockups, examples, or screenshots.
```

### Feature Discussion

1. Open a **Discussion** on GitHub to propose major features
2. Get feedback from maintainers and community
3. Once approved, create an issue and start development

## 🌟 Recognition

Contributors will be:
- Listed in the [README.md](README.md) acknowledgments
- Mentioned in release notes
- Added to the contributors list on GitHub

## 📞 Community

### Getting Help

- **GitHub Discussions**: For questions and general discussions
- **GitHub Issues**: For bug reports and feature requests
- **Email**: harshyadav152@outlook.com

### Communication Guidelines

- Be respectful and constructive
- Provide clear, detailed information
- Use English for all communications
- Search before asking questions
- Stay on topic

## 📚 Additional Resources

- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/)
- [Firefox WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 🎯 Good First Issues

New to the project? Look for issues labeled:
- `good first issue` - Perfect for beginners
- `help wanted` - Community contributions welcome
- `documentation` - Improve docs

## ⚡ Quick Reference

```bash
# Clone and setup
git clone https://github.com/HarshYadav152/ss-capture.git
cd ss-capture
cd ss-capture
npm install

# Create feature branch
git checkout -b feature/my-feature

# Make changes, then build and test
npm run build
npm test

# Commit and push
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature

# Create PR on GitHub
```

---

Thank you for contributing to SS-Capture! 🎉

**Questions?** Open a discussion or contact the maintainers.

**Made with ❤️ by contributors like you!**