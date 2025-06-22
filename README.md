
# Cascade Explorer

Cascade Explorer is an interactive web application designed to help users explore the potential ripple effects and cascading consequences of an initial assertion, idea, decision, or plan. It leverages Generative AI (via Genkit and Google's Gemini models) to analyze user input, generate a system model, predict multi-phase impacts, and synthesize findings into a narrative summary.

The goal is to provide a powerful tool for deeper systems thinking, risk assessment, and strategic foresight.

## Core Technologies

*   **Next.js**: React framework for server-side rendering, routing, and building the user interface.
*   **React**: JavaScript library for building user interfaces, using hooks for state management.
*   **TypeScript**: Superset of JavaScript adding static type definitions for robust data structures.
*   **ShadCN UI**: Re-usable UI components built with Radix UI and Tailwind CSS.
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
*   **Genkit (by Firebase)**: An open-source framework for building AI-powered applications, used here to orchestrate calls to language models.
*   **Google Gemini Models**: Used by Genkit for generative AI capabilities.
*   **D3.js**: JavaScript library for data visualization, used to render the interactive impact network graph and system model graph.

## Application Workflow: How It Works

The application guides the user through a structured, multi-step process of exploration. Each step is powered by one or more dedicated AI flows.

### 1. Assertion & Model Selection
*   **User Input**: The user begins by providing an initial assertion, idea, plan, or decision. They can also select the underlying AI model (e.g., Gemini Flash, Pro) to balance speed and capability.
*   **AI Flow**: `assertion-reflection.ts`

### 2. Reflection & System Model Generation
*   **AI Analysis**: The AI processes the assertion to create a **System Model**, which is a structured representation of the key elements at play. This model includes:
    *   **Stocks**: Key resources or accumulations that can change over time (e.g., "Public Trust", "Company Profitability").
    *   **Agents**: The actors or entities who can influence the stocks (e.g., "Consumers", "Government Regulators").
    *   **Incentives & Flows**: The motivations of agents and the actions they take that affect stocks.
    *   **Stock-to-Stock Flows**: Direct causal links between stocks (e.g., an increase in "Employee Well-being" directly boosts "Productivity").
*   **User Review**: The user reviews the AI's summary and the extracted system model. The model can be viewed as a list or an interactive D3.js graph.
*   **Feedback Loop**: The user can provide textual feedback to correct or enhance the model (e.g., "You missed the 'Environmental Lobby' agent"). This feedback is processed by the `revise-system-model-with-feedback.ts` flow, which returns an updated model.

### 3. Initial State & Tension Analysis
*   **AI Analysis**: Once the user confirms the system model, two AI flows run:
    1.  `infer-initial-qualitative-state.ts`: The AI assesses the likely starting condition of each stock (e.g., "Public Trust" is 'Moderate', "Carbon Footprint" is 'High') based on the context of the assertion. This sets the baseline for the simulation.
    2.  `tension-identification.ts`: To make the simulation more realistic, this flow analyzes the system for inherent conflicts, such as **competing stakeholder goals**, **resource constraints**, and **strategic trade-offs**.
*   **User Review**: The user reviews this analysis, which provides crucial context for the consequences to come.

### 4. Multi-Phase Impact Generation
*   **Core Simulation Loop**: The application generates consequences in three distinct phases, simulating how effects ripple outwards over time. The `generate-impacts-by-order.ts` flow is the engine for this process.
    *   **Phase 1 (Initial Consequences)**: Direct, immediate results of the assertion, given the initial system state and identified tensions.
    *   **Phase 2 (Transition Phase)**: Second-order effects that arise from the initial impacts. The system's state (the qualitative condition of the stocks) evolves based on Phase 1 impacts, influencing the generation of Phase 2 consequences.
    *   **Phase 3 (Stabilization Phase)**: Third-order effects representing longer-term shifts and emergent behaviors as the system settles into new patterns.
*   **Branching & Confluence**: The AI is prompted to generate a rich network, allowing individual impacts to **branch** into multiple distinct children, while also allowing multiple prior impacts to **converge** on a single new outcome (a confluence).
*   **Interactive Network Graph**: The results are visualized as a D3.js network graph, showing the causal links from the core assertion through all three phases of impact.

### 5. Review & Refinement
*   **Node Inspection**: The user can click on any node in the graph to see a detailed panel with its description, the AI's reasoning for its plausibility, and other metadata. The user can update the "validity" of any impact.
*   **Consolidation**: At the end of each phase, the user can run the `suggest-impact-consolidation.ts` flow. This AI analyzes the impacts within that phase and suggests merging redundant or highly similar items, helping to simplify the map.

### 6. Narrative Synthesis
*   **AI Analysis**: Once the exploration is complete, the user can trigger the `generate-cascade-summary.ts` flow.
*   **Final Output**: This flow takes the *entire* context—the initial assertion, the evolving state of the system stocks, and the full set of generated impacts—and synthesizes it into a cohesive, persuasive essay. The essay explains the logical progression from the initial idea to its ultimate potential outcomes, written in natural language without technical jargon.

## What's Working Well (Strengths)

*   **Structured AI Interaction**: The use of Zod for schema definition and Genkit flows for orchestrating AI calls ensures that the application receives reliable, structured JSON data. This is fundamental to powering the UI and visualizations.
*   **Dynamic System Model**: The conceptual model of Stocks, Agents, and Flows is a powerful abstraction for systems thinking. Visualizing this model as a graph provides immediate insight into the key players and variables.
*   **Evolving System State**: The `qualitativeState` of stocks, which changes from phase to phase based on the consequences generated, is a core success. It adds a dynamic, simulation-like quality to the exploration, making the process feel more alive and responsive.
*   **Realism through Tension Analysis**: The `tension-identification` flow is a sophisticated feature that significantly grounds the simulation in reality. By considering constraints and conflicting stakeholder goals, it prevents the model from producing overly simplistic or naively optimistic outcomes.
*   **User Agency and Interactivity**: The application provides multiple points for user intervention: revising the initial model, updating the plausibility of impacts, and applying consolidation suggestions. This transforms the user from a passive observer into an active participant in the analysis.
*   **Narrative Synthesis**: The final summary generation is a powerful capstone feature, translating the complex, structured data of the impact map back into a human-readable and persuasive story.

## Areas for Improvement & Next Steps

While the core workflow is powerful, several areas could be enhanced to better align with the application's design intent.

*   **Challenge: AI Prompt Brittleness & Logical Leaps**
    *   **Observation**: The quality of the generated impacts and narrative is highly sensitive to the exact wording of the prompts. At times, the AI can "collapse" consequences into a single outcome instead of branching, or make connections that seem like a "reach."
    *   **Improvement**:
        1.  **Refine Prompts**: Continuously refine prompts to better balance instructions for branching vs. confluence.
        2.  **Few-Shot Prompting**: Introduce examples of good (diverse, branching) and bad (collapsed, illogical) outputs directly into the prompts to give the AI a clearer model to follow.
        3.  **Self-Correction Steps**: Enhance the prompts with explicit "self-correction" instructions, asking the AI to review its own output for diversity and logical coherence before finalizing it.

*   **Challenge: Graph Visualization & Layout**
    *   **Observation**: The D3 force-directed layout, while standard, can become chaotic with a large number of nodes. Overlapping labels and edges can reduce readability, even with the current parallel link offsets.
    *   **Improvement**:
        1.  **Advanced Layouts**: Experiment with alternative D3 layouts that may be better suited, such as `d3.cluster()` or `d3.tree()` for a more organized hierarchical view, while still allowing for cross-links.
        2.  **Curved Links**: Implement curved path generators (`d3.line().curve(...)`) for links, especially for parallel and self-referencing links. This would make connections much clearer than the current label-offset strategy.
        3.  **Sticky Nodes**: Allow users to manually drag and pin nodes in place (`fx`, `fy` properties in D3) to manually organize the graph for better readability.

*   **Challenge: Client-Side State Management Complexity**
    *   **Observation**: The main `page.tsx` component manages a significant amount of complex state (`allImpactNodes`, `reflectionResult`, `currentSystemQualitativeStates`, etc.) using many individual `useState` hooks. This can become difficult to trace and debug as more features are added.
    *   **Improvement**:
        1.  **Refactor with a Reducer**: Consolidate state management into a single `useReducer` hook. Actions like `CONFIRM_REFLECTION`, `GENERATE_IMPACTS`, `APPLY_CONSOLIDATION` would lead to more predictable state transitions.
        2.  **Consider a State Library**: For even more complex state, a lightweight state management library like Zustand or Jotai could provide a more scalable and maintainable solution.

*   **Challenge: Lack of a "Memory" for the Exploration**
    *   **Observation**: The current process is linear. If a user wants to go back to Phase 1, change a validity assessment, and see how it affects Phases 2 and 3, they have to start the entire exploration over.
    *   **Improvement**:
        1.  **State Snapshots**: Implement a state history system. Before generating impacts for a new phase, take a snapshot of the current state (`allImpactNodes`, `systemQualitativeStates`).
        2.  **"Forking" an Exploration**: Allow the user to revert to a previous snapshot and re-run the generation from that point, creating a new "branch" of their exploration. This would transform the tool from a linear process into a true exploratory sandbox.

*   **Challenge: Quantitative vs. Qualitative Model**
    *   **Observation**: The model is purely qualitative ("Strong", "Weak", "Moderate"). This is excellent for conceptual thinking but limits deeper analysis where magnitude matters.
    *   **Improvement (Future Vision)**: Introduce an optional quantitative layer. Stocks could have a numeric value (e.g., 1-10). Flows could be defined with simple modifiers (e.g., "+1", "-2"). This would evolve the tool into a lightweight, user-friendly system dynamics modeling environment, fulfilling the project's ultimate potential.

## Project Structure

*   `src/app/`: Next.js App Router pages and layouts.
    *   `page.tsx`: The main page component for the Cascade Explorer.
    *   `layout.tsx`: Root layout.
    *   `globals.css`: Global styles and Tailwind CSS theme (ShadCN variables).
*   `src/components/`: React components.
    *   `cascade-explorer/`: Components specific to the Cascade Explorer application (e.g., `AssertionInputForm.tsx`, `NetworkGraph.tsx`, `SystemModelGraph.tsx`, `NodeDetailPanel.tsx`).
    *   `ui/`: ShadCN UI components.
*   `src/ai/`: Genkit related files.
    *   `genkit.ts`: Genkit global configuration and initialization.
    *   `flows/`: Genkit flows defining AI interactions (e.g., `assertion-reflection.ts`, `generate-impacts-by-order.ts`).
    *   `actions/`: Server actions callable from the client (e.g., for updating the AI model).
*   `src/types/`: TypeScript type definitions, particularly `cascade.ts` for application-specific data structures.
*   `src/hooks/`: Custom React hooks (e.g., `use-toast.ts`).
*   `public/`: Static assets.
*   `package.json`: Project dependencies and scripts.
*   `next.config.ts`: Next.js configuration, including Webpack fallbacks.
*   `components.json`: ShadCN UI configuration.

## Getting Started

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn

### Installation

1.  Clone the repository and navigate into the project directory.
2.  Install dependencies: `npm install`

### Environment Setup

This project uses the Google AI plugin for Genkit, which requires a `GOOGLE_API_KEY`.

1.  **Create a `.env` file** in the root of the project.
2.  **Add your API key:**
    ```env
    GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
    ```
    *   You can obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   The application includes a check and will throw a clear error on startup if this key is missing.

### Running the Application

You need to run the Next.js frontend and the Genkit development server simultaneously in two separate terminals.

1.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    This will start the frontend on `http://localhost:9002`.

2.  **Start the Genkit development server:**
    ```bash
    npm run genkit:watch
    ```
    This starts the Genkit server (typically on `http://localhost:3400`) and watches for changes in your AI flows.

Once both servers are running, open `http://localhost:9002` in your browser.
