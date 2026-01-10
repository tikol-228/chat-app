import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import ChatLayout from '../components/ChatLayout'
import Auth from '../components/Auth'

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* redirect сразу на auth */}
        <Route path="/" element={<Navigate to="/auth" replace />} />

        {/* auth page */}
        <Route path="/auth" element={<Auth />} />

        {/* chat */}
        <Route path="/chat" element={<ChatLayout />} />

      </Routes>
    </BrowserRouter>
  )
}

export default Router
