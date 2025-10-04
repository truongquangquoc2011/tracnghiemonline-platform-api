import { io } from 'socket.io-client'
import { LobbyEvents } from '../src/routes/lobby/lobby.events'

const pinCode = '483186' // nhớ thay bằng pinCode lobby mà backend generate khi tạo
const nickname = 'Hoster'

const socket = io('http://localhost:8080', { transports: ['websocket'] })

socket.on('connect', () => {
  console.log('Host connected:', socket.id)
  socket.emit(LobbyEvents.JOIN_LOBBY, { pinCode, nickname })
})

socket.on(LobbyEvents.LOBBY_STATE, (state) => console.log('Lobby state:', state))
socket.on(LobbyEvents.PLAYER_JOINED, (data) => console.log('Player joined:', data))
socket.on(LobbyEvents.QUESTION_STARTED, (q) => console.log('Question started:', q))
socket.on(LobbyEvents.LEADERBOARD_UPDATE, (lb) => console.log('Leaderboard update:', lb))
socket.on(LobbyEvents.ERROR, (err) => console.error('Error:', err))

// Host start game sau 5s
setTimeout(() => {
  console.log('Starting game...')
  socket.emit(LobbyEvents.START_GAME, { pinCode })
}, 5000)
