import React from "react";
import ReactDOM from "react-dom/client";
import { CalculatorApp } from "./features/calculator/CalculatorApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CalculatorApp />
  </React.StrictMode>,
);
