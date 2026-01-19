import { useState, useEffect } from 'react'
import styles from './Profile.module.css'
import { useAuth } from '../AuthContext'
import axios from 'axios'
import { Link } from 'react-router-dom'

const Profile = () => {
  const { user, updateUser, token } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    about: user?.about || 'No info yet.',
    avatar: user?.avatar || ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        about: user.about || '',
        avatar: user.avatar || ''
      })
    }
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
      const res = await axios.put('/api/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      updateUser(res.data.user)
      setIsEditing(false)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error updating profile')
    }
  }

  return (
    <div className={styles.profilePage}>
      <Link to="/" style={{ color: 'white', marginBottom: '20px', display: 'block' }}>← Back to Chat</Link>
      
      <div className={styles.header}>
        <label className={styles.avatarWrapper}>
          {formData.avatar ? (
            <img src={formData.avatar} className={styles.avatar} />
          ) : (
            <div className={styles.emptyAvatar}>{user?.name[0]}</div>
          )}
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
          )}
        </label>

        <div className={styles.mainInfo}>
          {isEditing ? (
            <input 
              className={styles.editInput}
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              placeholder="@username"
            />
          ) : (
            <h2>{user?.username}</h2>
          )}
          <p className={styles.status}>{user?.email}</p>
        </div>
        
        <button 
          className={styles.editBtn}
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          {isEditing ? 'Save' : 'Edit Profile'}
        </button>
      </div>

      <div className={styles.block}>
        <h3>About</h3>
        {isEditing ? (
          <textarea 
            className={styles.editTextarea}
            value={formData.about}
            onChange={e => setFormData({...formData, about: e.target.value})}
          />
        ) : (
          <p>{user?.about || 'No information provided.'}</p>
        )}
      </div>
    </div>
  )
}

export default Profile
