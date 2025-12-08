import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Custom providers wrapper for tests.
 * Add your context providers here (e.g., ThemeProvider, AuthProvider).
 */
interface ProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: ProvidersProps) {
  return (
    // Add your providers here
    // <ThemeProvider>
    //   <AuthProvider>
    <>
      {children}
    </>
    //   </AuthProvider>
    // </ThemeProvider>
  );
}

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * @example
 * ```tsx
 * const { getByRole } = renderWithProviders(<MyComponent />);
 * ```
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Setup function for tests that need user interaction.
 * Returns render result and userEvent instance.
 *
 * @example
 * ```tsx
 * const { user, getByRole } = setup(<MyComponent />);
 * await user.click(getByRole('button'));
 * ```
 */
function setup(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return {
    user: userEvent.setup(),
    ...renderWithProviders(ui, options),
  };
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";

// Override render with our custom version
export { renderWithProviders as render, setup, userEvent };
