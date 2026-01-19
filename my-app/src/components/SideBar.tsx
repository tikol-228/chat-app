import styles from './SideBar.module.css'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

interface SideBarProps {
  onlineUsers: string[]
  currentChat: string | null
  setCurrentChat: (chat: string | null) => void
  onJoinChat: (chat: string) => void
}

const SideBar = ({ onlineUsers, currentChat, setCurrentChat, onJoinChat }: SideBarProps) => {
  const [chats, setChats] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const { token } = useAuth()

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const data = await res.json()
          setSearchResults(data)
        } catch (err) {
          console.error(err)
        }
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, token])

  const handleStartChat = (user: any) => {
    // Add user to chat list if not exists
    // We use email as the ID for private chats
    const chatID = user.email
    
    setChats(prev => {
      if (prev.includes(chatID)) return prev
      return [chatID, ...prev]
    })
    
    onJoinChat(chatID) // Join socket room (if needed logic exists)
    setCurrentChat(chatID) // Set active
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.searchBar}>
        <input 
          type="text" 
          placeholder="Search users (@username)..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map(user => (
              <div key={user.email} className={styles.resultItem} onClick={() => handleStartChat(user)}>
                <span className={styles.resultName}>{user.name}</span>
                <span className={styles.resultUser}>{user.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ul className={styles.chatList}>
        <li 
          onClick={() => setCurrentChat(null)} 
          className={`${styles.chatItem} ${currentChat === null ? styles.active : ''}`}
        >
          <div className={styles.chatAvatar}>#</div>
          <div className={styles.chatInfo}>
            <span className={styles.chatName}>General Chat</span>
            <span className={styles.chatLastMsg}>Public room</span>
          </div>
        </li>

        {chats.map(chat => (
          <li 
            key={chat} 
            onClick={() => setCurrentChat(chat)} 
            className={`${styles.chatItem} ${currentChat === chat ? styles.active : ''}`}
          >
            <div className={styles.chatAvatar}>{chat[0].toUpperCase()}</div>
            <div className={styles.chatInfo}>
              <span className={styles.chatName}>{chat}</span>
              <span className={styles.chatLastMsg}>Private Chat</span>
            </div>
          </li>
        ))}
      </ul>

      <Link to="/profile" className={styles.profileLink}>
        Settings & Profile
      </Link>
    </aside>
  )
}

export default SideBar
