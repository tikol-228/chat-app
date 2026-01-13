import styles from './SideBar.module.css'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import AddChatModal from '../modals/AddChatModal'

interface SideBarProps {
  onlineUsers: string[]
  currentChat: string | null
  setCurrentChat: (chat: string | null) => void
  onJoinChat: (chat: string) => void
}

const SideBar = ({ onlineUsers, currentChat, setCurrentChat, onJoinChat }: SideBarProps) => {
  const [chats, setChats] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleAddChat = (chatName: string) => {
    setChats(prev => {
      if (prev.includes(chatName)) return prev
      return [...prev, chatName]
    })
    onJoinChat(chatName)
  }

  return (
    <aside className={styles.sidebar}>
      <h3>Online ({onlineUsers.length})</h3>
      <button onClick={() => setIsModalOpen(true)} className={styles.addChatBtn}>
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

      <AddChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddChat={handleAddChat} 
      />
    </aside>
  )
}

export default SideBar
