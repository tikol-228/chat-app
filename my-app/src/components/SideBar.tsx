import styles from './SideBar.module.css'
import { Link } from 'react-router-dom'
import { useState } from 'react'

interface SideBarProps {
  onlineUsers: string[]
  currentChat: string | null
  setCurrentChat: (chat: string | null) => void
}

const SideBar = ({ onlineUsers, currentChat, setCurrentChat }: SideBarProps) => {
  const [chats, setChats] = useState<string[]>([])

  const handleAddChat = () => {
    const username = prompt('Enter username')

    if (!username) return

    setChats(prev => {
      if (prev.includes(username)) return prev
      return [...prev, username]
    })
  }

  return (
    <aside className={styles.sidebar}>
      <h3>Online ({onlineUsers.length})</h3>
      <button onClick={handleAddChat} className={styles.addChatBtn}>
        Add Chat
      </button>
      <Link to="/profile">Profile</Link>

      <ul>
        {onlineUsers.map(user => (
          <li key={user}>
            <span className={styles.dot} />
            {user}
          </li>
        ))}
      </ul>
         
      <ul>
        <li onClick={() => setCurrentChat(null)} className={currentChat === null ? styles.active : ''}>General</li>
        {chats.map(chat => (
          <li key={chat} onClick={() => setCurrentChat(chat)} className={currentChat === chat ? styles.active : ''}>{chat}</li>
        ))}
      </ul>
    </aside>
  )
}

export default SideBar