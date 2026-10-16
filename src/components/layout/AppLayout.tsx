
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f3f4f6",
      }}
    >
      <Navbar />

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "stretch",
        }}
      >
        <Sidebar />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
