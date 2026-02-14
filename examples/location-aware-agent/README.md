# Location Aware Agent Example

A location aware chat interface for venue navigation, designed for unattended kiosk deployments (e.g., terminal directories, mall information stands, lobby wayfinding stations).

This agent knows its **exact physical position** in the venue, configured via environment variables. This enables location-aware features: automatic direction origins, proximity search, and system prompts that eliminate the need to ask users where they are.

The architecture uses the same **provider-agnostic AI interface** (`IAIClient`) as the basic agent, allowing the same application logic to work with different AI providers (Gemini, Claude, OpenAI, etc.). Currently, this example is configured with Google Gemini.

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Google Gemini API key (get one at <https://aistudio.google.com/apikey>)
- Atrius Wayfinder venue credentials
- Physical kiosk location coordinates (latitude, longitude, floor ID)

### Installation

1. **From the repository root, install dependencies**

   ```bash
   yarn install
   ```

2. **Set up environment variables**

   ```bash
   cd examples/location-aware-agent
   cp .env.example .env.local
   ```

   Edit `.env.local` in this directory and add your credentials:
   - `VITE_AI_CLIENT_API_KEY`: Your Google Gemini API key
   - `VITE_ATRIUS_VENUE_ID`: Your Atrius Wayfinder venue ID
   - `VITE_ATRIUS_ACCOUNT_ID`: Your Atrius Wayfinder account token/API key
   - `VITE_PINNED_LATITUDE`: Kiosk latitude coordinate
   - `VITE_PINNED_LONGITUDE`: Kiosk longitude coordinate
   - `VITE_PINNED_FLOOR_ID`: Floor ID where the kiosk is located
   - `VITE_PINNED_TITLE`: Display name for the kiosk position (e.g., "Main Lobby Kiosk")

3. **Start the development server**

   ```bash
   yarn workspace @examples/location-aware-agent dev
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

# Kiosk Position (required)
# Static physical location of the kiosk in the venue.
# The app uses this as the origin for directions and the center point for nearby search.
VITE_PINNED_LATITUDE=<latitude>
VITE_PINNED_LONGITUDE=<longitude>
VITE_PINNED_FLOOR_ID=<floor-id>
VITE_PINNED_TITLE=<display-title>
```

**Important:** Never commit `.env.local` to version control. Use `.env.example` as your template.

**Note:** The application performs a hard validation at startup and will not load if the pinned location variables (`VITE_PINNED_*`) are missing.

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
yarn workspace @examples/location-aware-agent dev
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

1. **User approaches kiosk** and sends a message → "What's nearby?"
2. **Agent receives the query** and sends it to Gemini with available tools and the kiosk's location context
3. **Gemini responds** with either:
   - Direct text answer
   - Tool calls (e.g., `searchNearby` for proximity results, `showDirections` for wayfinding)
4. **Agent executes tools** using the Wayfinder SDK (headless mode)
5. **Results sent back to Gemini** for context
6. **Gemini generates final response** informed by venue data and the kiosk's position
7. **Response displayed** in chat with markdown formatting

### Location-Aware Behavior

Because the kiosk knows its exact position, the AI behaves differently than a general-purpose agent:

- **Directions** always start from the kiosk — users only specify a destination
- **Nearby queries** ("What's around here?") trigger `searchNearby`, scoped to the kiosk's floor and coordinates
- **No location questions** — the AI never asks "Where are you?" because it already knows
- **Proactive suggestions** — for vague queries, the AI uses `searchNearby` to find relevant options automatically

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
- **WayfinderSDK**: Wraps locusmaps-sdk for type-safe venue operations; supports headless mode

### **Example Layer** (This directory)

- **Tools**: Kiosk-specific tool definitions (`search`, `showDirections`, `searchNearby`) with pinned-location awareness
- **Prompts**: System instructions with `Location Awareness` context injected from the kiosk's coordinates
- **ChatDrawer**: Full-screen chat interface (the entire kiosk UI)

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
[Tool Call?] → Execute tool (with pinned location injected) → Send results back to Gemini
    ↓
Final response text
    ↓
Display in ChatMessage (rendered as markdown)
```

---

## Technology Stack

| Layer                  | Technology            | Purpose                                   |
| ---------------------- | --------------------- | ----------------------------------------- |
| **Frontend Framework** | React 19 + TypeScript | Modern, type-safe UI                      |
| **Build Tool**         | Vite                  | Fast development and production builds    |
| **Styling**            | CSS Modules           | Scoped, maintainable component styles     |
| **Markdown Rendering** | react-markdown        | Format AI responses with rich text        |
| **Map Engine**         | locusmaps-sdk         | Venue data, search, directions (headless) |
| **AI Provider**        | Google Gemini API     | LLM with tool/function calling support    |
| **Fuzzy Search**       | fuse.js               | Client-side search enhancement            |
| **Schema Validation**  | Typebox               | Runtime validation for tool parameters    |
| **Testing**            | Vitest                | Unit and integration tests                |
| **Linting**            | ESLint + TypeScript   | Code quality and type safety              |
| **Monorepo**           | Yarn Workspaces       | Package management and linking            |

---

## Key Features

- **Pinned Location Awareness**: The kiosk's exact position (lat/lng/floor) is injected into every AI prompt and tool call, enabling location-aware responses without user input
- **Headless Map Mode**: The Wayfinder SDK runs without rendering a visible map — all venue data operations (search, directions, POI details) work in the background
- **Automatic Direction Origin**: `showDirections` always starts from the kiosk's position; users only specify destinations
- **Proximity Search**: The `searchNearby` tool finds POIs near the kiosk within a configurable radius (default 100m), scoped to the kiosk's floor
- **Chat-Only Interface**: Full-screen conversational UI designed for unattended kiosk deployments — no map panel, no split layout
- **Location-Aware Prompts**: System instructions include a `Location Awareness` section that tells the AI the kiosk's exact position and floor, eliminating location-clarification questions
- **Startup Validation**: The application validates that all pinned location environment variables are configured before loading, with a descriptive error if anything is missing
- **Provider-Agnostic Design**: IAIClient interface enables AI provider swapping without changing tools or UI
- **Type Safety**: Full TypeScript throughout for compile-time error detection
- **Monorepo Architecture**: Shared packages (`@core/agent`, `@core/wayfinder`, `@core/chat-ui`, etc.) enable building multiple example apps

---

## Differences from Basic Agent

| Aspect                   | Basic Agent                                | Location Aware Agent                                         |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| **Map**                  | Visible map panel (~80% of screen)         | Headless — no visible map                                    |
| **Layout**               | Side-by-side: map + chat drawer            | Full-screen chat only                                        |
| **User location**        | Unknown — AI asks clarifying questions     | Known — pinned via environment variables                     |
| **Direction origin**     | User specifies both origin and destination | Origin is always the kiosk; only destination needed          |
| **Proximity search**     | Not available                              | `searchNearby` tool scoped to kiosk position                 |
| **System prompts**       | Generic; asks user about their location    | Includes `Location Awareness` context; no location questions |
| **Startup requirements** | Venue credentials only                     | Venue credentials + pinned location coordinates              |

---

## Extending the Sample

### Customize System Instructions

The AI's behavior is guided by system instructions in `src/prompts.ts`. You can customize the `BASE_SYSTEM_INSTRUCTION` to:

- Change the assistant's tone and personality
- Add domain-specific knowledge or protocols
- Define behavior for out-of-scope requests
- Specify search strategies and fallback logic

The `buildLocationContext()` function generates the kiosk's location context. You can extend it to include additional venue-specific information (e.g., nearby landmarks, operating hours).

### Add New Tools

To add a new tool (e.g., amenity discovery, facility lookup):

1. Define the tool in `src/tools.ts` using the `AgentTool` interface from `@core/agent`
2. Add it to the tools array in `src/components/ChatDrawer.tsx`
3. The tool is now available to the AI (no UI changes needed)

For location-aware tools, use `getPinnedLocation()` from `@core/wayfinder` to access the kiosk's coordinates.

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

**Ready to deploy?** Configure your kiosk's position, add venue credentials, and start building location-aware conversational kiosks!
