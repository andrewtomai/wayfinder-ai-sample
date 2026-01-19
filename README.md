# Atrius Wayfinder AI Chat Sample

A sample React web application demonstrating integration of the **locusmaps-sdk** with an AI-powered chat interface. This project showcases how to build a natural language venue assistant powered by AI.

This repository is provided _as-is_ and is for educational and integration reference purposes.

---

## ⚠️ Security Warning

**THIS CODE SHOULD NOT BE DEPLOYED AS A PUBLIC WEBAPP AS-IS.**

This sample exposes your AI provider API key in client-side code, which is a significant security risk. In a production environment, you **must**:

1. **Create a backend service** to proxy requests to the LLM (e.g., Node.js, Python, Go)
2. **Store API keys** securely on the server (environment variables, secrets management)
3. **Validate requests** on the backend before forwarding to LLM
4. **Implement rate limiting** and authentication for client requests
5. **Use HTTPS** for all communication

**For local development:** This sample is safe to use locally as-is for learning and testing.

**For production:** Refactor to move AI client logic to your backend, and have the frontend communicate with your backend instead of directly with the LLM API.

See the [Extending the Sample](#extending-the-sample) section for guidance on architectural improvements.

---

## Overview

This sample demonstrates a practical pattern for integrating Atrius Wayfinder's mapping experience and data with conversational AI. Users can interact with an indoor venue map through natural language queries—asking about locations, amenities, and navigation—while the AI processes requests and uses the SDK to provide accurate, map-aware responses.

The architecture uses a **provider-agnostic AI interface** (`IAIClient`), allowing the same application logic to work with different AI providers (Gemini, Claude, OpenAI, etc.). Currently, the sample is configured with Google Gemini.

**Target Audience:**

- Developers integrating locusmaps-sdk with conversational AI
- Teams building venue navigation or wayfinding applications
- Anyone exploring patterns for LLM tool use in location-based services

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Google Gemini API key (get one at https://aistudio.google.com/apikey)
- Atrius Wayfinder venue credentials

### Installation

1. **Clone/download this repository**

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your credentials:
   - `VITE_AI_CLIENT_API_KEY`: Your Google Gemini API key
   - `VITE_ATRIUS_VENUE_ID`: Your Atrius Wayfinder venue ID
   - `VITE_ATRIUS_ACCOUNT_ID`: Your Atrius Wayfinder account token/API key

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. **Open your browser**
   Navigate to `http://localhost:5173`

---

## Project Structure

```
wayfinder-ai/
├── src/
│   ├── agent/                          # AI orchestration
│   │   ├── Agent.ts                    # Tool execution loop orchestrator
│   │   ├── IAIClient.ts                # Provider-agnostic AI interface
│   │   ├── types.ts                    # Shared type definitions
│   │   ├── tools.ts                    # Tool definitions (search, directions, etc.)
│   │   └── prompts.ts                  # System instructions and configuration
│   │
│   ├── apis/                           # External service integrations
│   │   ├── gemini.ts                   # Google Gemini API client (implements IAIClient)
│   │   └── wayfinder/                  # Atrius Wayfinder SDK wrapper with type safety
│   │
│   ├── components/                     # React UI components
│   │   ├── ChatDrawer.tsx              # Chat interface container
│   │   ├── ChatMessage.tsx             # Message display with markdown rendering
│   │   ├── ChatInput.tsx               # User input component
│   │   └── *.module.css                # Component-scoped styles
│   │
│   ├── utils/                          # Helper utilities
│   │   ├── logger.ts                   # Debug logging utility
│   │   └── messageFilter.ts            # Tool message filtering
│   │
│   ├── App.tsx                         # Main application component
│   └── main.tsx                        # Entry point
│
├── .env.example                        # Environment variable template
├── vite.config.ts                      # Vite build configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Dependencies and scripts
└── README.md                           # This file
```

---

## Architecture Overview

The application follows a clean separation of concerns:

### **AI Layer** (`src/agent/`)

- **Agent**: Orchestrates the conversation loop, executing tools and managing state
- **IAIClient**: Provider-agnostic interface that abstracts AI provider details
- **Tools**: Definitions for venue operations (search, directions, POI details)

### **Provider Layer** (`src/apis/`)

- **GeminiClient**: Implements IAIClient for Google Gemini; handles API specifics
- **WayfinderSDK**: Wraps locusmaps-sdk for type-safe venue operations

### **UI Layer** (`src/components/`)

- **ChatDrawer**: Main chat interface with message history
- **ChatMessage**: Renders AI responses with markdown support
- **ChatInput**: User input with optional suggestions

### **Data Flow**

```
User Input
    ↓
ChatDrawer component
    ↓
Agent.chat() method
    ↓
Gemini API (via IAIClient.generate())
    ↓
[Tool Call?] → Execute tool → Send results back to Gemini
    ↓
Final response text
    ↓
Display in ChatMessage (rendered as markdown)
    ↓
Map updates via locusmaps-sdk
```

---

## Technology Stack

| Layer                  | Technology            | Purpose                                |
| ---------------------- | --------------------- | -------------------------------------- |
| **Frontend Framework** | React 19 + TypeScript | Modern, type-safe UI                   |
| **Build Tool**         | Vite                  | Fast development and production builds |
| **Styling**            | CSS Modules           | Scoped, maintainable component styles  |
| **Markdown Rendering** | react-markdown        | Format AI responses with rich text     |
| **Map Integration**    | locusmaps-sdk         | Venue data, search, visualization      |
| **AI Provider**        | Google Gemini API     | LLM with tool/function calling support |
| **Fuzzy Search**       | fuse.js               | Client-side search enhancement         |
| **Testing**            | Vitest                | Unit and integration tests             |
| **Linting**            | ESLint + TypeScript   | Code quality and type safety           |

---

## Configuration

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# Atrius Wayfinder Venue Configuration
# Get these from your Atrius Wayfinder administrator
VITE_ATRIUS_VENUE_ID=<your-venue-id>
VITE_ATRIUS_ACCOUNT_ID=<your-account-key>

# AI Client Configuration
# Get Gemini API key from https://aistudio.google.com/apikey
VITE_AI_CLIENT_API_KEY=<your-gemini-api-key>
VITE_AI_CLIENT_MODEL=gemini-2.0-flash

# Optional: Adjust AI behavior (0.0 = deterministic, 1.0 = creative)
VITE_AI_CLIENT_TEMPERATURE=0.7
```

**Important:** Never commit `.env.local` to version control. Use `.env.example` as your template.

---

## Running the Project

### Development

```bash
npm run dev
```

Starts a local dev server with hot module reloading. Open `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

Creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing.

### Type Checking

```bash
npm run check-types
```

Runs TypeScript compiler without building (catch type errors).

### Linting

```bash
npm run lint
```

Checks code quality with ESLint.

### Testing

```bash
npm run test
```

Runs unit tests with Vitest.

---

## How It Works

### Chat Flow

1. **User sends a message** → "Where is the nearest restaurant?"
2. **Agent receives the query** and sends it to Gemini with available tools
3. **Gemini responds** with either:
   - Direct text answer
   - Tool calls (e.g., `search` for locations)
4. **Agent executes tools** using locusmaps-sdk
5. **Results sent back to Gemini** for context
6. **Gemini generates final response** with information from tool results
7. **Response displayed** in chat with markdown formatting

### Tool Execution Loop

The Agent runs an iterative loop (max 10 iterations) to handle tool requests:

- Each iteration checks if Gemini requested tool execution
- Tools are executed with validated arguments
- Results are collected and sent back to Gemini
- Loop continues until Gemini provides final text response

This architecture allows AI to reason about tool use and refine results before responding to the user.

---

## Key Features

- **Real-time Chat Interface**: Responsive UI with message history and typing indicators
- **AI-Powered Search**: Natural language queries mapped to venue locations
- **Tool Execution**: Seamless integration with locusmaps-sdk capabilities
- **Markdown Support**: Rich formatting in AI responses (lists, code blocks, etc.)
- **Provider-Agnostic Design**: IAIClient interface enables AI provider swapping
- **Type Safety**: Full TypeScript throughout for catch-time error detection
- **Debug Logging**: Colored console logs for understanding tool execution flow

---

## Extending the Sample

### Customize System Instructions

The AI's behavior is guided by system instructions in `src/agent/prompts.ts`. You can customize the `BASE_SYSTEM_INSTRUCTION` to:

- Change the assistant's tone and personality
- Add domain-specific knowledge or protocols
- Define behavior for out-of-scope requests
- Specify search strategies and fallback logic

### Add New Tools

To add a new tool (e.g., amenity discovery, facility lookup):

1. Define the tool interface in `src/agent/types.ts`
2. Implement the tool function in `src/agent/tools.ts`
3. Add it to the tools array in `src/agent/Agent.ts`
4. The tool is now available to the AI (no UI changes needed)

### Switch AI Providers

To use Claude, OpenAI, or another provider:

1. Create a new client file (e.g., `src/apis/claude.ts`)
1. Implement the `IAIClient` interface
1. Update `src/agent/Agent.ts` to instantiate your new client
1. Everything else works unchanged

The provider-agnostic architecture means the Agent, tools, and UI don't care which AI provider you use—only the specific client implementation changes.

---

## License

This project is provided AS-IS under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Support

For issues with this sample:

- Check the [Atrius documentation](https://docs.atrius.com)
- Review the inline code comments (especially `IAIClient.ts` for architecture details)
- Run tests to verify setup: `npm run test`

---

**Ready to build? Customize the system instructions, add your venue credentials, and start building venue-aware AI applications!**
