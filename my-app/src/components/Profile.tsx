import { useState } from 'react'
import styles from './Profile.module.css'

interface ProfileData {
  username: string
  avatar: string
  status: 'online' | 'offline'
  about: string
  email: string
  country: string
  joined: string
  stats: {
    chats: number
    friends: number
    messages: number
  }
}

const Profile = () => {
  const [profile, setProfile] = useState<ProfileData>({
    username: 'Username',
    avatar: '', // сначала пусто
    status: 'online',
    about: 'Frontend developer. Loves React, UI design and building pet projects.',
    email: 'user@gmail.com',
    country: 'Ukraine',
    joined: '2025',
    stats: {
      chats: 12,
      friends: 5,
      messages: 438
    }
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setProfile(p => ({
        ...p,
        avatar: reader.result as string
      }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.header}>

        <label className={styles.avatarWrapper}>
          {profile.avatar ? (
            <img src={profile.avatar} className={styles.avatar} />
          ) : (
            <div className={styles.emptyAvatar}>Upload</div>
          )}

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
        </label>

        <div className={styles.mainInfo}>
          <h2>{profile.username}</h2>
          <p className={styles.status}>{profile.status}</p>
        </div>
      </div>
    </div>
  )
}

export default Profile
