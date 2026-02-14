# Atrius Wayfinder AI Samples

A collection of sample applications demonstrating integration of the **Wayfinder JS-SDK** with AI-powered interfaces. This monorepo provides reusable core packages and multiple example applications showing different patterns for building AI-enhanced venue navigation experiences.

This repository is provided _as-is_ and is for educational and integration reference purposes.

---

## ⚠️ Security Warning

**THESE SAMPLES SHOULD NOT BE DEPLOYED AS PUBLIC WEBAPPS AS-IS.**

These samples expose AI provider API keys in client-side code, which is a significant security risk. In a production environment, you **must**:

1. **Create a backend service** to proxy requests to the LLM (e.g., Node.js, Python, Go)
2. **Store API keys** securely on the server (environment variables, secrets management)
3. **Validate requests** on the backend before forwarding to LLM
4. **Implement rate limiting** and authentication for client requests
5. **Use HTTPS** for all communication

**For local development:** These samples are safe to use locally as-is for learning and testing.

**For production:** Refactor to move AI client logic to your backend, and have the frontend communicate with your backend instead of directly with the LLM API.

See each example's README for guidance on architectural improvements and extension patterns.

---

## Getting Started with Examples

This repository contains multiple example applications. Choose the one that matches your use case:

### **Basic Chat Agent** (`examples/basic-agent/`)

A conversational interface for venue navigation. Users interact with an indoor map through natural language queries—asking about locations, amenities, and wayfinding—while an AI assistant processes requests and provides map-aware responses.

**Best for:** Building chatbot-driven venue assistants, Natural Language based navigation

👉 **[Get started with Basic Chat Agent](examples/basic-agent/README.md)**

### **Location Aware Agent (Kiosk)** (`examples/location-aware-agent/`)

A full-screen kiosk interface for unattended display screens (airports, malls, etc.). Currently a placeholder—see Basic Chat Agent for a working reference implementation.

👉 **[Location Aware Agent Documentation](examples/location-aware-agent/README.md)**

---

## Project Structure

This repository is organized as a **Yarn workspaces monorepo** with shared packages and example applications.

### Workspace Packages

| Package                          | Scope                           | Description                                 |
| -------------------------------- | ------------------------------- | ------------------------------------------- |
| `@core/agent`                    | `packages/agent`                | AI agent framework with tool execution loop |
| `@core/gemini`                   | `packages/gemini`               | Google Gemini AI client implementation      |
| `@core/wayfinder`                | `packages/wayfinder`            | Atrius Wayfinder SDK wrapper with search    |
| `@core/logger`                   | `packages/logger`               | Debug logging utility                       |
| `@examples/basic-agent`          | `examples/basic-agent`          | Chat-based venue assistant example          |
| `@examples/location-aware-agent` | `examples/location-aware-agent` | Kiosk display example (placeholder)         |

---

## Architecture Overview

The application follows a clean separation of concerns:

### **AI Layer** (`packages/agent`)

- **Agent**: Orchestrates the conversation loop, executing tools and managing state
- **IAIClient**: Provider-agnostic interface that abstracts AI provider details
- **AgentConfig**: Dependency injection pattern — tools, prompts, and AI client are provided at construction

### **Provider Layer** (`packages/gemini`, `packages/wayfinder`)

- **GeminiClient**: Implements IAIClient for Google Gemini; handles API specifics
- **WayfinderSDK**: Wraps locusmaps-sdk for type-safe venue operations

### **Example Layer** (`examples/basic-agent`)

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
| **Package Manager**    | Yarn Workspaces       | Monorepo management and linking        |
| **Map Integration**    | locusmaps-sdk         | Venue data, search, visualization      |
| **AI Interface**       | Provider-agnostic     | Support for any LLM with tool calling  |
| **Testing**            | Vitest                | Unit and integration tests             |
| **Linting**            | ESLint + TypeScript   | Code quality and type safety           |

For detailed technology stacks and implementation details per example, see the example's README.

---

## Running Commands

All commands are run from the repository root using Yarn workspaces.

### Development

```bash
yarn dev
```

Starts the default dev server with hot module reloading. By default, this runs `@examples/basic-agent`. Open `http://localhost:5173`.

To run a specific example:

```bash
yarn workspace @examples/basic-agent dev
```

### Other Commands

```bash
yarn check-types    # TypeScript type checking
yarn lint           # ESLint code quality checks
yarn test           # Run unit tests with Vitest
```

For example-specific commands and detailed setup instructions, see the example's README file.

---

## Support

For issues and questions:

- **Atrius Documentation:** [https://docs.atrius.com](https://docs.atrius.com)
- **Testing:** Run `yarn test` to verify your setup

---

## License

This project is provided AS-IS under the MIT License. See the [LICENSE](LICENSE) file for details.
