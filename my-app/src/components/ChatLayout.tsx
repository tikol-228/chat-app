import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import styles from './ChatLayout.module.css'
import SideBar from './SideBar'
import { useAuth } from '../AuthContext'
import { Navigate } from 'react-router-dom'

interface Message {
  id: number
  text: string
  sender: string
  chat?: string
}

const ChatLayout = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [socket, setSocket] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, messageId?: number}>({visible: false, x: 0, y: 0})
  const [currentChat, setCurrentChat] = useState<string | null>(null)
  const { user, token, logout } = useAuth()
  
  useEffect(() => {
    if (!user || !token) return

    const newSocket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })

    setSocket(newSocket)
    newSocket.emit('join')

    newSocket.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on('userJoined', (user: string) => {
      setOnlineUsers(prev => [...prev, user])
      setMessages(prev => [
        ...prev,
        { id: Date.now(), text: `${user} joined the chat`, sender: 'System' }
      ])
    })

    newSocket.on('userLeft', (user: string) => {
      setOnlineUsers(prev => prev.filter(u => u !== user))
      setMessages(prev => [
        ...prev,
        { id: Date.now(), text: `${user} left the chat`, sender: 'System' }
      ])
    })

    newSocket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users)
    })

    fetchMessages()

    return () => {
      newSocket.disconnect()
    }
  }, [user, token])

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3000/messages', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = () => {
    if (input.trim() && socket) {
      socket.emit('sendMessage', { text: input, chat: currentChat })
      setInput('')
    }
  }

  const deleteMessage = async (id: number) => {
    try {
      await fetch(`http://localhost:3000/messages/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  if (!user) {
    return <Navigate to="/auth" />
  }

  return (
    <div className={styles.root} onClick={() => setContextMenu({visible: false, x: 0, y: 0})}>
      <div className={styles.card}>

        <SideBar onlineUsers={onlineUsers} currentChat={currentChat} setCurrentChat={setCurrentChat} />

        <main className={styles.main}>
          <header className={styles.header}>
            <h2>{currentChat ? `Chat with ${currentChat}` : 'General Chat'}</h2>
            <span>You are: {user.name}</span>
            <button onClick={logout}>Logout</button>
          </header>
        
          <div className={styles.messages}>
            {(() => {
              const filteredMessages = currentChat ? messages.filter(m => m.chat === currentChat || m.sender === 'System') : messages
              return filteredMessages.map(m => {
                const type =
                  m.sender === 'System'
                    ? styles.system
                    : m.sender === user.email
                    ? styles.own
                    : styles.other

                return (
                  <div key={m.id} className={`${styles.message} ${type}`} onContextMenu={(e) => { e.preventDefault(); setContextMenu({visible: true, x: e.clientX, y: e.clientY, messageId: m.id}) }}>
                    {m.sender !== 'System' && (
                      <div className={styles.sender}>{m.sender}</div>
                    )}
                    <div className={styles.bubble}>{m.text}</div>
                  </div>
                )
              })
            })()}
          </div>

          {contextMenu.visible && (
            <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button onClick={() => { if (contextMenu.messageId) deleteMessage(contextMenu.messageId); setContextMenu({visible: false, x: 0, y: 0}) }}>Delete</button>
            </div>
          )}

          <div className={styles.inputBar}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </main>

      </div>
    </div>
  )
}

export default ChatLayout