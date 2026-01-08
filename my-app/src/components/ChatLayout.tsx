import { useState, useEffect, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import styles from './ChatLayout.module.css'

interface Message {
  id: number
  text: string
  sender: string
}

interface IncomingCall {
  offer: RTCSessionDescriptionInit
  from: string
}

const ChatLayout = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [username, setUsername] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  // WebRTC states
  const [isCalling, setIsCalling] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [remoteUser, setRemoteUser] = useState('')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  const fetchMessages = async () => {
    try {
      const response = await fetch('/messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    setIsCalling(false)
    setRemoteUser('')
    setIncomingCall(null)
    socket?.emit('end-call', { to: remoteUser })
  }, [localStream, remoteUser, socket])

  useEffect(() => {
    if (!isLoggedIn) return

    const newSocket = io({
      transports: ['websocket'],
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // WebRTC event handlers
    newSocket.on('call-made', async (data) => {
      setIncomingCall(data)
      setRemoteUser(data.from)
    })

    newSocket.on('answer-made', async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    })

    newSocket.on('ice-candidate', (data) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    })

    newSocket.on('call-rejected', () => {
      endCall()
      alert('Call rejected')
    })

    newSocket.on('call-ended', () => {
      endCall()
    })

    fetchMessages()

    return () => {
      newSocket.disconnect()
    }
  }, [isLoggedIn, username, endCall])

  // WebRTC functions
  const startCall = async (targetUser: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setLocalStream(stream)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })
      peerConnectionRef.current = peerConnection

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })

      peerConnection.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            to: targetUser
          })
        }
      }

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      if (socket) {
        socket.emit('call-user', {
          offer: offer,
          to: targetUser
        })
      }

      setIsCalling(true)
      setRemoteUser(targetUser)
    } catch (error) {
      console.error('Error starting call:', error)
    }
  }

  const answerCall = async () => {
    if (!incomingCall) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setLocalStream(stream)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })
      peerConnectionRef.current = peerConnection

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })

      peerConnection.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            to: incomingCall.from
          })
        }
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      if (socket) {
        socket.emit('make-answer', {
          answer: answer,
          to: incomingCall.from
        })
      }

      setIsCalling(true)
      setIncomingCall(null)
    } catch (error) {
      console.error('Error answering call:', error)
    }
  }

  const rejectCall = () => {
    if (socket && incomingCall) {
      socket.emit('reject-call', { to: incomingCall.from })
    }
    setIncomingCall(null)
  }

  const sendMessage = () => {
    if (input.trim() && socket && username) {
      socket.emit('sendMessage', { text: input, sender: username })
      setInput('')
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
    <div className={styles.root}>
      <div className={styles.card}>

        <aside className={styles.sidebar}>
          <h3>Online ({onlineUsers.length})</h3>
          <ul>
            {onlineUsers.map(user => (
              <li key={user}>
                <span className={styles.dot} />
                {user}
                {user !== username && (
                  <button 
                    onClick={() => startCall(user)}
                    disabled={isCalling}
                    className={styles.callButton}
                  >
                    📞
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <main className={styles.main}>
          <header className={styles.header}>
            <h2>Chat</h2>
            <button 
              onClick={() => startCall(onlineUsers.find(u => u !== username) || '')} 
              disabled={isCalling || onlineUsers.filter(u => u !== username).length === 0}
              className={styles.headerCallButton}
            >
              📞 Call
            </button>
            <span>You are: {username}</span>
          </header>

          {incomingCall && (
            <div className={styles.callNotification}>
              <p>Incoming call from {incomingCall.from}</p>
              <button onClick={answerCall}>Answer</button>
              <button onClick={rejectCall}>Reject</button>
            </div>
          )}

          {isCalling && (
            <div className={styles.callActive}>
              <p>On call with {remoteUser}</p>
              <button onClick={endCall}>End Call</button>
            </div>
          )}

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
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={() => startCall(onlineUsers.find(u => u !== username) || '')} disabled={isCalling || onlineUsers.filter(u => u !== username).length === 0}>📞 Call</button>
            <button onClick={sendMessage}>Send</button>
          </div>
        </main>

      </div>

      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}

export default ChatLayout