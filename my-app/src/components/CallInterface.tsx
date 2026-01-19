import React, { useEffect, useRef } from 'react'
import styles from './CallInterface.module.css'

interface CallInterfaceProps {
  incomingCall: { from: string, roomId: string } | null
  activeCall: boolean
  onAccept: () => void
  onDecline: () => void
  onHangup: () => void
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  remoteUser: string | null
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  incomingCall,
  activeCall,
  onAccept,
  onDecline,
  onHangup,
  localStream,
  remoteStream,
  remoteUser
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, activeCall])

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, activeCall])

  if (incomingCall) {
    return (
      <div className={styles.callModal}>
        <div className={styles.callerInfo}>
          <div className={styles.avatar}>{incomingCall.from[0].toUpperCase()}</div>
          <div className={styles.status}>
            <h3>{incomingCall.from}</h3>
            <span>Incoming call...</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.decline}`} onClick={onDecline}>Decline</button>
          <button className={`${styles.btn} ${styles.accept}`} onClick={onAccept}>Accept</button>
        </div>
      </div>
    )
  }

  if (activeCall) {
    return (
      <div className={styles.activeCall}>
        <div className={styles.videoGrid}>
          <div className={styles.videoContainer}>
            <video ref={localVideoRef} autoPlay playsInline muted />
            <span className={styles.videoLabel}>You</span>
          </div>
          {remoteStream && (
            <div className={styles.videoContainer}>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <span className={styles.videoLabel}>{remoteUser}</span>
            </div>
          )}
        </div>
        
        <div className={styles.controls}>
          {/* Mute/Video toggle buttons could be added here */}
          <button className={`${styles.controlBtn} ${styles.hangup}`} onClick={onHangup}>
            📞
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default CallInterface
