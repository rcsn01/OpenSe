import { Navigate, Route, Routes } from 'react-router-dom'
import { AssistantWorkspace } from './components/AssistantWorkspace'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AssistantWorkspace />} />
      <Route path="/sessions/:sessionId" element={<AssistantWorkspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
