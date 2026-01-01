# Contributing to Full Page Screenshot Capture

Thank you for your interest in contributing to Full Page Screenshot Capture! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Reports**: Report issues you encounter
- **✨ Feature Requests**: Suggest new features
- **🔧 Code Contributions**: Submit pull requests
- **📚 Documentation**: Improve docs and examples
- **🎨 UI/UX Improvements**: Enhance the user interface
- **🧪 Testing**: Help test on different browsers/platforms
- **🌐 Translations**: Add support for new languages

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ (for development tools)
- Git
- A modern browser (Chrome, Firefox, Edge)

### Development Setup

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/HarshYadav152/ss-capture.git
   cd ss-capture
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Load** the extension in your browser for testing
5. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Guidelines

### Code Style

- Use **ES6+** JavaScript features
- Follow **consistent indentation** (2 spaces)
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep functions **small and focused**

### File Structure

```
ss-capture/
   └──src/
      ├── manifest.json         # Extension manifest
      ├── popup/
      │     ├── popup.html      # Main UI
      │     └── popup.js        # UI logic
      ├── content/
      │     └── content.js      # Page capture logic
      ├── css/
      |     └──style.css        # CSS styles
      └── js/
          ├── background.js     # Service worker
          └── content.js        # Page capture logic
      
```

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(ui): add dark mode toggle
fix(capture): resolve rate limiting issue
docs(readme): update installation instructions
```

## 🧪 Testing

### Manual Testing

Before submitting a PR, test your changes:

- [ ] **Short pages** (< 1 viewport height)
- [ ] **Long pages** (5-10 viewport heights)
- [ ] **Pages with fixed elements**
- [ ] **Error scenarios** (rate limits, timeouts)
- [ ] **Different browsers** (Chrome, Firefox, Edge)
- [ ] **Responsive design** (different screen sizes)

### Automated Testing
<!-- will be added -->

## 🔧 Building

### Development Build

```bash
# Watch mode for development
npm run dev

# Build for development
npm run build:dev
```

### Production Build

```bash
# Build for all browsers
npm run build:all

# Build for specific browser
npm run build:chrome
npm run build:firefox
npm run build:edge
```

## 📦 Submitting Changes

### Pull Request Process

1. **Update** the changelog in `CHANGELOG.md`
2. **Test** your changes thoroughly
3. **Update** documentation if needed
4. **Submit** a pull request with a clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Automated tests pass
- [ ] Cross-browser testing done

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Changelog updated
```

## 🐛 Reporting Issues

### Bug Report Template

```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: [e.g. Chrome 120]
- OS: [e.g. Windows 11]
- Extension Version: [e.g. 1.1.0]

## Additional Information
Screenshots, console logs, etc.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the requested feature

## Use Case
Why this feature would be useful

## Proposed Implementation
How you think it could be implemented

## Alternatives Considered
Other approaches you've considered
```

## 🎨 UI/UX Contributions

### Design Guidelines

- Follow the **glassmorphic design** theme
- Use the established **color palette**:
  - Primary: `#78dbff` (cyan)
  - Error: `#ff77c6` (pink)
  - Success: `#78ffc6` (green)
- Maintain **transparency** and **blur effects**
- Ensure **accessibility** standards
- Test on **different screen sizes**

## 🌐 Internationalization

### Adding Translations

1. Create translation files in `src/locales/`
2. Update `manifest.json` with new locales
3. Test with different languages
4. Update documentation

### Translation Guidelines

- Use **clear, concise** language
- Maintain **consistent terminology**
- Consider **cultural context**
- Test with **native speakers**

## 📚 Documentation

### Documentation Guidelines

- Write **clear, concise** explanations
- Include **code examples**
- Add **screenshots** for UI changes
- Keep **README.md** updated
- Document **API changes**

### Documentation Structure

```
docs/ (open issue for that)
├── api/              # API documentation
├── guides/           # User guides
├── development/      # Developer docs
└── assets/          # Images and resources
```

## 🔒 Security

### Security Guidelines

- **Never** commit sensitive data
- **Validate** all user inputs
- **Sanitize** data before processing
- **Follow** security best practices
- **Report** security issues privately

### Reporting Security Issues

For security issues, please email: HarshYadav152@outlook.com

## 🏆 Recognition

### Contributors

All contributors will be recognized in:

- **README.md** contributors section
- **GitHub** contributors page
- **Release notes**
- **Project documentation**

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Discord**: For real-time chat (link)
- **Email**: For private matters

### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 🎯 Focus Areas

### High Priority

- **Performance improvements**
- **Browser compatibility**
- **Accessibility enhancements**
- **Security fixes**

### Medium Priority

- **New features**
- **UI improvements**
- **Documentation updates**
- **Testing coverage**

### Low Priority

- **Nice-to-have features**
- **Cosmetic changes**
- **Experimental features**

---

Thank you for contributing to SS-capture 🚀 