import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button component", () => {
  it("should render with default variant", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("should render with custom variant", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: /delete/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-destructive");
  });

  it("should render with different sizes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });

  it("should handle click events", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should not trigger click when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    await user.click(screen.getByRole("button"));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should render as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/link");
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should pass through additional props", () => {
    render(
      <Button data-testid="custom-button" type="submit">
        Submit
      </Button>
    );

    const button = screen.getByTestId("custom-button");
    expect(button).toHaveAttribute("type", "submit");
  });

  describe("variant styles", () => {
    const variants = [
      { variant: "default" as const, expectedClass: "bg-primary" },
      { variant: "destructive" as const, expectedClass: "bg-destructive" },
      { variant: "outline" as const, expectedClass: "border" },
      { variant: "secondary" as const, expectedClass: "bg-secondary" },
      { variant: "ghost" as const, expectedClass: "hover:bg-accent" },
      { variant: "link" as const, expectedClass: "underline-offset-4" },
    ];

    variants.forEach(({ variant, expectedClass }) => {
      it(`should apply correct classes for ${variant} variant`, () => {
        render(<Button variant={variant}>Button</Button>);

        const button = screen.getByRole("button");
        expect(button).toHaveClass(expectedClass);
      });
    });
  });
});
