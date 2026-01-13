import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import styles from './ChatLayout.module.css'
import SideBar from './SideBar'
import { useAuth } from '../AuthContext'
import { Navigate } from 'react-router-dom'
import CallInterface from './CallInterface'

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
  
  // Call State
  const [incomingCall, setIncomingCall] = useState<{ from: string, roomId: string } | null>(null)
  const [activeCall, setActiveCall] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [remoteUser, setRemoteUser] = useState<string | null>(null)
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const { user, token, logout } = useAuth()
  
  useEffect(() => {
    if (!user || !token) return

    const newSocket = io({
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

    // Call Events
    newSocket.on('incomingCall', ({ from, roomId }: { from: string, roomId: string }) => {
      setIncomingCall({ from, roomId })
    })

    newSocket.on('callAccepted', async () => {
      // Start WebRTC negotiation
      const pc = peerConnectionRef.current
      if (pc) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        newSocket.emit('webrtc:offer', offer)
      }
    })

    // WebRTC Signaling
    newSocket.on('webrtc:offer', async (offer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        newSocket.emit('webrtc:answer', answer)
      }
    })

    newSocket.on('webrtc:answer', async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      }
    })

    newSocket.on('webrtc:ice', async (candidate: RTCIceCandidateInit) => {
      const pc = peerConnectionRef.current
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    })

    newSocket.on('webrtc:leave', () => {
      endCall()
    })

    fetchMessages()

    return () => {
      newSocket.disconnect()
      endCall()
    }
  }, [user, token])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages', {
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
      await fetch(`/api/messages/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  // --- CALL LOGIC ---

  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice', event.candidate)
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
    } catch (err) {
      console.error('Error accessing media devices:', err)
      alert('Could not access camera/microphone')
      return null
    }

    peerConnectionRef.current = pc
    return pc
  }

  const startCall = async () => {
    if (!currentChat || !socket) return
    
    setRemoteUser(currentChat)
    setActiveCall(true)
    
    // Create room ID: myEmail-targetEmail
    const roomId = `${user?.email}-${currentChat}`
    
    const pc = await setupPeerConnection()
    if (pc) {
      socket.emit('call', { to: currentChat })
      // We wait for 'acceptCall' to start negotiation
      socket.emit('webrtc:join', { roomId })
    }
  }

  const acceptCall = async () => {
    if (!incomingCall || !socket) return
    
    setRemoteUser(incomingCall.from)
    setActiveCall(true)
    setIncomingCall(null)
    
    const pc = await setupPeerConnection()
    if (pc) {
      socket.emit('acceptCall', { roomId: incomingCall.roomId })
    }
  }

  const declineCall = () => {
    setIncomingCall(null)
    // Optional: emit decline event
  }

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    setRemoteStream(null)
    setActiveCall(false)
    setIncomingCall(null)
    if (socket) {
      socket.emit('webrtc:leave')
    }
  }

  const handleJoinChat = (chatName: string) => {
    if (socket) {
      socket.emit('joinRoom', chatName)
    }
  }

  if (!user) {
    return <Navigate to="/auth" />
  }

  return (
    <div className={styles.root} onClick={() => setContextMenu({visible: false, x: 0, y: 0})}>
      <CallInterface 
        incomingCall={incomingCall}
        activeCall={activeCall}
        onAccept={acceptCall}
        onDecline={declineCall}
        onHangup={endCall}
        localStream={localStream}
        remoteStream={remoteStream}
        remoteUser={remoteUser}
      />

      <div className={styles.card}>

        <SideBar 
          onlineUsers={onlineUsers} 
          currentChat={currentChat} 
          setCurrentChat={setCurrentChat}
          onJoinChat={handleJoinChat}
        />

        <main className={styles.main}>
          <header className={styles.header}>
            <div className={styles.headerInfo}>
              <h2>{currentChat ? `Chat with ${currentChat}` : 'General Chat'}</h2>
              <span>You are: {user.name}</span>
            </div>
            <div className={styles.headerActions}>
              {currentChat && (
                <button onClick={startCall} className={styles.callBtn} title="Call">
                  📞 Call
                </button>
              )}
              <button onClick={logout}>Logout</button>
            </div>
          </header>
        
          <div className={styles.messages}>
            {messages.map(m => {
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
