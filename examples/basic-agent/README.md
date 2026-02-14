# Basic Chat Agent Example

A conversational interface for venue navigation. This example demonstrates a practical pattern for integrating Atrius Wayfinder's mapping experience and data with conversational AI. Users can interact with an indoor venue map through natural language queries—asking about locations, amenities, and navigation—while the AI processes requests and uses the SDK to provide accurate, map-aware responses.

The architecture uses a **provider-agnostic AI interface** (`IAIClient`), allowing the same application logic to work with different AI providers (Gemini, Claude, OpenAI, etc.). Currently, this example is configured with Google Gemini.

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Google Gemini API key (get one at <https://aistudio.google.com/apikey>)
- Atrius Wayfinder venue credentials

### Installation

1. **From the repository root, install dependencies**

   ```bash
   yarn install
   ```

2. **Set up environment variables**

   ```bash
   cd examples/basic-agent
   cp .env.example .env.local
   ```

   Edit `.env.local` in this directory and add your credentials:
   - `VITE_AI_CLIENT_API_KEY`: Your Google Gemini API key
   - `VITE_ATRIUS_VENUE_ID`: Your Atrius Wayfinder venue ID
   - `VITE_ATRIUS_ACCOUNT_ID`: Your Atrius Wayfinder account token/API key

3. **Start the development server**

   ```bash
   yarn workspace @examples/basic-agent dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

---

## Configuration

### Environment Variables

Create a `.env.local` file in this directory based on `.env.example`:

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

## Running the Application

All commands are run from the repository root using Yarn workspaces.

### Development

```bash
yarn dev
```

Starts a local dev server with hot module reloading. Open `http://localhost:5173`.

Or, run specifically for this example:

```bash
yarn workspace @examples/basic-agent dev
```

### Type Checking

```bash
yarn check-types
```

Runs TypeScript compiler without building (catch type errors).

### Linting

```bash
yarn lint
```

Checks code quality with ESLint.

### Testing

```bash
yarn test
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

## Architecture Overview

This example follows a clean separation of concerns across the monorepo:

### **AI Layer** (`@core/agent`)

- **Agent**: Orchestrates the conversation loop, executing tools and managing state
- **IAIClient**: Provider-agnostic interface that abstracts AI provider details
- **AgentConfig**: Dependency injection pattern — tools, prompts, and AI client are provided at construction

### **Provider Layer** (`@core/gemini`, `@core/wayfinder`)

- **GeminiClient**: Implements IAIClient for Google Gemini; handles API specifics
- **WayfinderSDK**: Wraps locusmaps-sdk for type-safe venue operations

### **Example Layer** (This directory)

- **Tools & Prompts**: Example-specific tool definitions and system instructions
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
| **Monorepo**           | Yarn Workspaces       | Package management and linking         |

---

## Key Features

- **Real-time Chat Interface**: Responsive UI with message history and typing indicators
- **AI-Powered Search**: Natural language queries mapped to venue locations
- **Tool Execution**: Seamless integration with locusmaps-sdk capabilities
- **Markdown Support**: Rich formatting in AI responses (lists, code blocks, etc.)
- **Provider-Agnostic Design**: IAIClient interface enables AI provider swapping
- **Type Safety**: Full TypeScript throughout for compile-time error detection
- **Debug Logging**: Colored console logs for understanding tool execution flow
- **Monorepo Architecture**: Shared packages enable building multiple example apps

---

## Extending the Sample

### Customize System Instructions

The AI's behavior is guided by system instructions in `src/prompts.ts`. You can customize the `BASE_SYSTEM_INSTRUCTION` to:

- Change the assistant's tone and personality
- Add domain-specific knowledge or protocols
- Define behavior for out-of-scope requests
- Specify search strategies and fallback logic

### Add New Tools

To add a new tool (e.g., amenity discovery, facility lookup):

1. Define the tool in `src/tools.ts` using the `AgentTool` interface from `@core/agent`
2. Add it to the tools array in `src/components/ChatDrawer.tsx`
3. The tool is now available to the AI (no UI changes needed)

### Switch AI Providers

To use Claude, OpenAI, or another provider:

1. Create a new package (e.g., `packages/claude/`) or add a client file
2. Implement the `IAIClient` interface from `@core/agent`
3. Update the `AgentConfig` in this example to use the new client
4. Everything else works unchanged

The provider-agnostic architecture means the Agent, tools, and UI don't care which AI provider you use—only the specific client implementation changes.

---

## Support

For issues with this example:

- Check the [Atrius documentation](https://docs.atrius.com)
- Run tests to verify setup: `yarn test`
- See the [root README](../../README.md) for general repository information

---

**Ready to customize?** Update system instructions, add venue credentials, and start building venue-aware AI applications!
