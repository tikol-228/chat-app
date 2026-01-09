import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import styles from './ChatLayout.module.css'
import SideBar from './SideBar'

interface Message {
  id: number
  text: string
  sender: string
}

const ChatLayout = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [socket, setSocket] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, messageId?: number}>({visible: false, x: 0, y: 0})
  
  useEffect(() => {
    if (!isLoggedIn) return

    const newSocket = io({
      transports: ['websocket'],
    })

    setSocket(newSocket)
    newSocket.emit('join', username)

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
  }, [isLoggedIn, username])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = () => {
    if (input.trim() && socket && username) {
      socket.emit('sendMessage', { text: input, sender: username })
      setInput('')
    }
  }

  const deleteMessage = async (id: number) => {
    try {
      await fetch(`/messages/${id}`, { method: 'DELETE' })
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleLogin = () => {
    if (username.trim()) setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.loginRoot}>
        <div className={styles.loginCard}>
          <h1>💬 Real-Time Chat</h1>
          <p>Enter your name</p>

          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Your name..."
          />

          <button onClick={handleLogin}>Join chat</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root} onClick={() => setContextMenu({visible: false, x: 0, y: 0})}>
      <div className={styles.card}>

        <SideBar onlineUsers={onlineUsers} />

        <main className={styles.main}>
          <header className={styles.header}>
            <h2>Chat</h2>
            <span>You are: {username}</span>
          </header>

          <div className={styles.messages}>
            {messages.map(m => {
              const type =
                m.sender === 'System'
                  ? styles.system
                  : m.sender === username
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
            })}
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