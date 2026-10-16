
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Employees from "./pages/employees/Employees";
import Tasks from "./pages/tasks/Tasks";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
       <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
      element={
        <ProtectedRoute allowedRoles={["admin", "manager"]} />
      }
      >
        <Route path="/employees" element={<Employees />} />
       </Route>  
       
        <Route path="/tasks" element={<Tasks />} />
       </Route> 
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<h1>404 - Page not found</h1>} />
    </Routes>
  );
}
