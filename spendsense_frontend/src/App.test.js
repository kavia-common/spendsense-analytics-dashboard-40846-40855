import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders SpendSense brand", () => {
  render(<App />);
  // The brand exists in the Layout navbar even for guests.
  const brand = screen.getByText(/spendsense/i);
  expect(brand).toBeInTheDocument();
});
