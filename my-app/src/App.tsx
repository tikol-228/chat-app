import './App.css'
import Auth from './components/Auth'
import ChatLayout from './components/ChatLayout'
import Profile from './components/Profile'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'

function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatLayout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth" element={<Auth/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
