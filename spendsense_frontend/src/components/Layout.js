import React from "react";
import Navbar from "./Navbar";

// PUBLIC_INTERFACE
export default function Layout({ children }) {
  /** Main page layout: navbar + content area. */
  return (
    <div className="ss-app">
      <Navbar />
      <main className="ss-main">
        <div className="ss-container">{children}</div>
      </main>
    </div>
  );
}
