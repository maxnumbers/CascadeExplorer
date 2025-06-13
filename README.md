
# Cascade Explorer

Cascade Explorer is an interactive web application designed to help users explore the potential ripple effects and cascading consequences of an initial assertion, idea, decision, or plan. It leverages Generative AI (via Genkit and Google's Gemini models) to analyze user input, generate a system model, predict multi-order impacts, and synthesize findings into a narrative summary.

The goal is to provide a tool for deeper systems thinking, risk assessment, and strategic foresight.

## Core Technologies

*   **Next.js**: React framework for server-side rendering, routing, and building the user interface.
*   **React**: JavaScript library for building user interfaces.
*   **TypeScript**: Superset of JavaScript adding static type definitions.
*   **ShadCN UI**: Re-usable UI components built with Radix UI and Tailwind CSS.
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
*   **Genkit (by Firebase)**: An open-source framework for building AI-powered applications, used here to orchestrate calls to language models.
*   **Google Gemini Models**: Used by Genkit for generative AI capabilities.
*   **D3.js**: JavaScript library for data visualization, used to render the impact network graph and system model graph.

## Key Features

*   **Assertion Input**: Users can input their initial assertion, idea, or plan via text or voice.
*   **AI-Powered Reflection**:
    *   The AI reflects on the user's input to confirm understanding.
    *   It generates a concise summary of the assertion.
    *   It extracts a **System Model** identifying key:
        *   **Stocks**: Accumulations or resources (e.g., "Public Trust").
        *   **Agents**: Actors or entities (e.g., "Government," "Consumers").
        *   **Incentives & Flows**: Motivations of agents concerning stocks and the resulting actions.
*   **System Model Visualization**: The extracted system model can be viewed as:
    *   A structured list.
    *   An interactive D3.js graph showing stocks, agents, and their relationships.
*   **Multi-Order Impact Generation**:
    *   **1st Order Impacts**: Direct consequences of the initial assertion.
    *   **2nd Order Impacts**: Effects stemming from 1st order impacts.
    *   **3rd Order Impacts**: Broader societal shifts or long-term consequences.
*   **Interactive Impact Network Graph**:
    *   Visualizes the core assertion and its generated impacts (up to 3rd order) as an interconnected network using D3.js.
    *   Nodes represent impacts, colored by order.
    *   Links show causal relationships.
*   **Node Detail Panel**:
    *   Clicking on a node in the graph opens a panel with detailed information about the impact.
    *   Users can review and update the AI-assessed 'validity' of an impact.
*   **Impact Consolidation Suggestions**:
    *   The AI can analyze the generated impacts and suggest consolidations for redundant or highly similar items within the same order.
    *   Users can review and apply these suggestions to simplify the impact map.
*   **Narrative Summary Generation**:
    *   The AI can generate a cohesive narrative essay that explains the logical progression from the initial assertion through its cascading consequences, drawing a clear line to its ultimate implications.
*   **Toast Notifications**: Provides feedback on AI operations and errors.
*   **Responsive Design**: UI adapts to different screen sizes.

## Project Structure

*   `src/app/`: Next.js App Router pages and layouts.
    *   `page.tsx`: The main page component for the Cascade Explorer.
    *   `layout.tsx`: Root layout.
    *   `globals.css`: Global styles and Tailwind CSS theme (ShadCN variables).
*   `src/components/`: React components.
    *   `cascade-explorer/`: Components specific to the Cascade Explorer application (e.g., `AssertionInputForm.tsx`, `NetworkGraph.tsx`, `SystemModelGraph.tsx`, `NodeDetailPanel.tsx`, `ReflectionDisplay.tsx`, `ConsolidationSuggestionsDisplay.tsx`).
    *   `ui/`: ShadCN UI components (e.g., `Button.tsx`, `Card.tsx`, `Dialog.tsx`).
*   `src/ai/`: Genkit related files.
    *   `genkit.ts`: Genkit global configuration.
    *   `dev.ts`: Genkit development server entry point.
    *   `flows/`: Genkit flows defining AI interactions (e.g., `assertion-reflection.ts`, `generate-impacts-by-order.ts`, `suggest-impact-consolidation.ts`, `generate-cascade-summary.ts`).
*   `src/types/`: TypeScript type definitions, particularly `cascade.ts` for application-specific types.
*   `src/lib/`: Utility functions (e.g., `utils.ts` for `cn`).
*   `src/hooks/`: Custom React hooks (e.g., `use-toast.ts`, `use-mobile.ts`).
*   `public/`: Static assets.
*   `package.json`: Project dependencies and scripts.
*   `next.config.ts`: Next.js configuration.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `components.json`: ShadCN UI configuration.

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Setup

This project uses Genkit with the Google AI plugin, which typically requires API keys for accessing Google's Generative AI models (like Gemini).

1.  **Create a `.env` file** in the root of the project by copying the `.env.example` if one exists, or creating a new one.
    ```
    touch .env
    ```

2.  **Add your API key to the `.env` file:**
    ```env
    # Example for Google AI Studio / Gemini API
    GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
    ```
    *   You can obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   The `src/ai/dev.ts` file uses `dotenv` to load these variables.

### Running the Application

The application consists of two main parts: the Next.js frontend and the Genkit development server for AI flows. You'll typically want to run both simultaneously in separate terminal windows.

1.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    This will usually start the frontend on `http://localhost:9002`.

2.  **Start the Genkit development server:**
    *   To run Genkit and have it automatically restart on file changes:
        ```bash
        npm run genkit:watch
        ```
    *   Alternatively, to run Genkit once:
        ```bash
        npm run genkit:dev
        ```
    This typically starts the Genkit server on `http://localhost:3400` where you can inspect flows.

Once both servers are running, open `http://localhost:9002` (or the port specified in your terminal for the Next.js app) in your browser.

## AI Flows

The application uses Genkit flows defined in `src/ai/flows/` to interact with the AI model:

*   **`assertion-reflection.ts`**: Takes the user's initial assertion, reflects on it, generates a summary, extracts a system model (stocks, agents, incentives), identifies key concepts, and forms a confirmation question.
*   **`generate-impacts-by-order.ts`**: Generates 1st, 2nd, or 3rd order impacts based on the initial assertion and any parent impacts from the preceding order. It includes structured key concepts, attributes, and causal reasoning for each impact.
*   **`suggest-impact-consolidation.ts`**: Analyzes the generated impacts (grouped by order) and suggests consolidations for similar or redundant items to simplify the impact map.
*   **`generate-cascade-summary.ts`**: Takes the complete set of impacts (initial assertion, 1st, 2nd, 3rd order) and generates a persuasive narrative essay summarizing the entire cascade.

## Customization and Extension

*   **Prompts**: Modify the prompts within the Genkit flows in `src/ai/flows/` to change the AI's behavior or output structure.
*   **UI Components**: Add or modify React components in `src/components/cascade-explorer/` to change the user interface.
*   **Styling**: Update Tailwind CSS classes or `src/app/globals.css` for visual changes.
*   **New AI Features**: Create new Genkit flows and integrate them into the frontend.
*   **Data Models**: Extend the TypeScript types in `src/types/cascade.ts` if you need to handle more complex data.

## Contributing

If you'd like to contribute:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please ensure your code follows the existing style and includes type checking (`npm run typecheck`).

---

This README should provide a good starting point for developers. Feel free to suggest additions or modifications!
