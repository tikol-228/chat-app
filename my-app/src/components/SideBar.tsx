import styles from './SideBar.module.css'
import { useState } from 'react'

interface SideBarProps {
  onlineUsers: string[]
}

const SideBar = ({ onlineUsers }: SideBarProps) => {
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

      <ul>
        {onlineUsers.map(user => (
          <li key={user}>
            <span className={styles.dot} />
            {user}
          </li>
        ))}
      </ul>
         
      <ul>
        {chats.map(chat => (
          <li key={chat}>{chat}</li>
        ))}
      </ul>
    </aside>
  )
}

export default SideBar