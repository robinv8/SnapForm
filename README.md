<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SnapForm - Chrome Extension

An intelligent Chrome extension that automatically fills web forms with realistic test data using AI or standard heuristics.

## ✨ Features

- 🤖 **AI-Powered Generation**: Supports Google Gemini, OpenAI, DeepSeek, and custom API endpoints for context-aware, realistic test data
- ⚡ **Standard Mode**: Fast heuristic-based generation without API requirements
- 🎯 **Smart Form Detection**: Automatically detects all form fields on any webpage
- 🔄 **One-Click Fill**: Fill entire forms instantly with a single click
- 🌐 **i18n**: Supports Chinese and English
- 🎨 **Modern UI**: Clean, professional interface with real-time activity logs
- 🔒 **Secure**: API keys stored securely in Chrome sync storage

## 🚀 Installation

### From Source

1. **Clone and build the extension:**

   ```bash
   git clone <repository-url>
   cd SnapForm
   npm install
   npm run build:extension
   ```

2. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project

## 🎯 Usage

### Basic Usage

1. **Navigate to any webpage with forms** (e.g., signup pages, contact forms)
2. **Click the SnapForm extension icon** in your Chrome toolbar
3. **Choose your mode:**
   - **Standard**: Fast generation using built-in heuristics
   - **AI Smart Fill**: Intelligent generation using Gemini AI (requires API key)
4. **Click "Auto Fill Form"** to populate all detected fields
5. **Review and submit** the form as needed

### Configuring AI Mode

1. Click the **Settings icon** (⚙️) in the extension popup
2. Choose your AI provider (Google Gemini, OpenAI, DeepSeek, or custom endpoint)
3. Paste your API key and click **Save Settings**
4. Your API key is securely stored and synced across your Chrome browsers

## 🛠️ Development

### Prerequisites

- Node.js >= 14.18.0
- npm, pnpm, or yarn

### Development Workflow

```bash
# Install dependencies
npm install

# Build for production
npm run build:extension

# Development mode (for testing changes)
npm run dev
```

### Project Structure

```
SnapForm/
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── popup/                 # Extension popup UI
│   ├── options/               # Settings page
│   ├── content/               # Content script (form detection)
│   ├── background/            # Service worker
│   ├── components/            # Shared React components
│   ├── services/              # API services
│   └── types.ts               # TypeScript definitions
└── dist/                      # Build output (load this in Chrome)
```

## 🔧 Technical Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **AI**: Google Gemini / OpenAI / DeepSeek / Custom API
- **Icons**: Lucide React

## 📝 How It Works

1. **Content Script** detects all form fields on the active webpage
2. **Popup** displays detected fields and provides fill controls
3. **Service** generates data based on field types and labels:
   - AI mode: Sends field definitions to Gemini API for intelligent generation
   - Standard mode: Uses pattern matching and heuristics
4. **Content Script** fills the form with generated data
5. **Activity Log** shows real-time status and results

## 🎨 Supported Field Types

- Text inputs (name, address, city, etc.)
- Email addresses
- Phone numbers
- Numbers (age, zip code, etc.)
- Select dropdowns
- Checkboxes
- Textareas
- Date fields

## 🔐 Privacy & Security

- API keys are stored locally in Chrome's sync storage
- No data is sent to external servers except your configured AI provider (when AI mode is used)
- Form data is generated locally and never stored
- Open source - audit the code yourself!
- [Privacy Policy](https://xrobin0926.github.io/SnapForm/privacy-policy.html)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**SnapForm** - Stop typing dummy data manually. v1.0.0
