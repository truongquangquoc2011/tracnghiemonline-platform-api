import { io } from 'socket.io-client'
import { LobbyEvents } from '../src/routes/lobby/lobby.events'

const pinCode = '483186' // trùng với host
const nickname = 'Vĩ L'

const socket = io('http://localhost:8080', { transports: ['websocket'] })

socket.on('connect', () => {
  console.log('Player connected:', socket.id)
  socket.emit(LobbyEvents.JOIN_LOBBY, { pinCode, nickname })
})

socket.on(LobbyEvents.QUESTION_STARTED, (payload) => {
  console.log('Question received:', payload.question)

  // giả lập player trả lời sau 2s
  setTimeout(() => {
    const firstAnswerId = payload.answers[0]?.id || null
    socket.emit(LobbyEvents.SUBMIT_ANSWER, {
      pinCode,
      questionId: payload.question.id,
      answerId: firstAnswerId,
      timeTakenMs: 2000,
    })
  }, 2000)
})

socket.on(LobbyEvents.ANSWER_FEEDBACK, (msg) => console.log('Feedback:', msg))
socket.on(LobbyEvents.LEADERBOARD_UPDATE, (lb) => console.log('Leaderboard:', lb))
socket.on(LobbyEvents.ERROR, (err) => console.error('Error:', err))
