import { Routes, Route, Navigate } from "react-router-dom"
import GlassDefs from "./components/GlassDefs.jsx"
import Dashboard from "./Dashboard.jsx"

export default function App() {
  return (
    <>
    <GlassDefs />
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
