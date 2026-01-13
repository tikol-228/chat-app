import React, { useState } from 'react'
import styles from './AddChatModal.module.css'

interface AddChatModalProps {
  isOpen: boolean
  onClose: () => void
  onAddChat: (chatName: string) => void
}

const AddChatModal = ({ isOpen, onClose, onAddChat }: AddChatModalProps) => {
  const [chatName, setChatName] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (chatName.trim()) {
      onAddChat(chatName)
      setChatName('')
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h2>Add Chat</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Chat Name"
            value={chatName}
            onChange={e => setChatName(e.target.value)}
            className={styles.input}
            autoFocus
          />
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={`${styles.button} ${styles.cancelButton}`}>
              Cancel
            </button>
            <button type="submit" className={`${styles.button} ${styles.addButton}`}>
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddChatModal
