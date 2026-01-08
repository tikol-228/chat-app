// WebRTC signaling handlers
export function setupWebRTCHandlers(io, socket, userSockets) {
  socket.on('call-user', (data) => {
    const { offer, to } = data;
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('call-made', {
        offer: offer,
        from: socket.username
      });
    }
  });

  socket.on('make-answer', (data) => {
    const { answer, to } = data;
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('answer-made', {
        answer: answer,
        from: socket.username
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { candidate, to } = data;
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('ice-candidate', {
        candidate: candidate,
        from: socket.username
      });
    }
  });

  socket.on('reject-call', (data) => {
    const { to } = data;
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('call-rejected', {
        from: socket.username
      });
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('call-ended', {
        from: socket.username
      });
    }
  });
}