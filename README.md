# 10x-cards

[![Project Status: In Development](https://img.shields.io/badge/status-in_development-yellowgreen.svg)](https://github.com/user/10x-cards)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An application for quickly creating and managing educational flashcards using AI. This tool helps users generate flashcard sets from text, saving time and effort in creating learning materials.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

**10x-cards** is designed to streamline the process of creating educational flashcards. Users can paste text from any source (e.g., textbook chapters, articles), and the application leverages Large Language Models (LLMs) to automatically generate a set of suggested flashcards (questions and answers). This significantly reduces the manual effort required for creating high-quality study materials, making effective learning methods like spaced repetition more accessible.

## Tech Stack

The project is built with a modern, scalable, and efficient technology stack:

| Category      | Technology                                                                                                  |
|---------------|-------------------------------------------------------------------------------------------------------------|
| **Frontend**  | [Astro](https://astro.build/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) |
| **Backend**   | [Supabase](https://supabase.com/) (PostgreSQL, Authentication, BaaS)                                        |
| **AI**        | [Openrouter.ai](https://openrouter.ai/) for access to various LLMs                                          |
| **Testing**   | [Vitest](https://vitest.dev/) (unit & integration), [MSW](https://mswjs.io/) (API mocking), [Playwright](https://playwright.dev/) (E2E), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) |
| **DevOps**    | [GitHub Actions](https://github.com/features/actions) for CI/CD, [Docker](https://www.docker.com/), [DigitalOcean](https://www.digitalocean.com/) for hosting |

## Getting Started Locally

To set up and run the project on your local machine, follow these steps.

### Prerequisites

- **Node.js**: Version `22.14.0` is required. We recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm).
  ```sh
  nvm use
  ```
- **npm**: Comes bundled with Node.js.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/10x-cards.git
    cd 10x-cards
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy the example environment file and fill in your API keys:

    ```bash
    cp .env.example .env
    ```

    Then edit `.env` and add your configuration:

    ```bash
    # .env
    PUBLIC_SUPABASE_URL="your-supabase-url"
    PUBLIC_SUPABASE_KEY="your-supabase-anon-key"
    OPENROUTER_API_KEY="your-openrouter-api-key"
    ```

### Running the Application

-   **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in `package.json`:

### Development

-   `npm run dev`: Starts the Astro development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Serves the production build locally for preview.

### Code Quality

-   `npm run lint`: Lints the code using ESLint to find and report issues.
-   `npm run lint:fix`: Automatically fixes fixable ESLint issues.
-   `npm run format`: Formats code using Prettier.

### Unit & Integration Testing

-   `npm run test`: Runs unit and integration tests with Vitest.
-   `npm run test:watch`: Runs tests in watch mode.
-   `npm run test:ui`: Opens Vitest UI for interactive test exploration.
-   `npm run test:coverage`: Runs tests with code coverage report.
-   `npm run test:run`: Runs tests once without watch mode.

### End-to-End Testing

-   `npm run e2e`: Runs Playwright E2E tests.
-   `npm run e2e:ui`: Opens Playwright UI for interactive test execution.
-   `npm run e2e:headed`: Runs E2E tests in headed browser mode.
-   `npm run e2e:debug`: Runs E2E tests in debug mode.
-   `npm run e2e:codegen`: Opens Playwright codegen to record tests.
-   `npm run e2e:report`: Opens the last Playwright test report.

## Project Scope

### Key Features

-   **AI-Powered Flashcard Generation**: Automatically create flashcard suggestions from user-provided text.
-   **Flashcard Management**: Manually create, review, edit, and delete flashcards.
-   **User Authentication**: Secure user registration and login.
-   **Spaced Repetition**: Integrates with a spaced repetition algorithm for effective learning sessions.
-   **Data Security**: User data and flashcards are stored securely, ensuring privacy.

### Out of Scope (MVP)

-   Advanced, custom-built spaced repetition algorithms.
-   Gamification features.
-   Native mobile applications.
-   Importing documents (PDF, DOCX).
-   Public API for third-party integrations.
-   Sharing flashcard decks between users.

## Project Status

This project is currently **in the early stages of development**. The core functionalities are being actively built.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
