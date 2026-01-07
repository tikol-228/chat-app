import React, { useState, useEffect } from 'react'
import io from 'socket.io-client'
import styles from './ChatLayout.module.css'

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

  useEffect(() => {
    if (isLoggedIn) {
      const newSocket = io('http://localhost:3000')
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
        newSocket.close()
      }
    }
  }, [isLoggedIn, username])

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3000/messages')
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage()
  }

  const handleLogin = () => {
    if (username.trim()) setIsLoggedIn(true)
  }

  const handleLoginKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLogin()
  }

  /* ================= LOGIN ================= */

  if (!isLoggedIn) {
    return (
      <div className={styles.loginRoot}>
        <div className={styles.loginCard}>
          <h1>💬 Real-Time Chat</h1>
          <p>Enter your name</p>

          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyPress={handleLoginKeyPress}
            placeholder="Your name..."
          />

          <button onClick={handleLogin}>Join chat</button>
        </div>
      </div>
    )
  }

  /* ================= CHAT ================= */

  return (
    <div className={styles.root}>
      <div className={styles.card}>

        <aside className={styles.sidebar}>
          <h3>Online ({onlineUsers.length})</h3>
          <ul>
            {onlineUsers.map(user => (
              <li key={user}>
                <span className={styles.dot} />
                {user}
              </li>
            ))}
          </ul>
        </aside>

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
                <div key={m.id} className={`${styles.message} ${type}`}>
                  {m.sender !== 'System' && (
                    <div className={styles.sender}>{m.sender}</div>
                  )}
                  <div className={styles.bubble}>{m.text}</div>
                </div>
              )
            })}
          </div>

          <div className={styles.inputBar}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
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
