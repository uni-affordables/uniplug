import { Router } from 'express'
import { postChat } from '../controllers/chat.controller'

const chatRouter = Router()

chatRouter.post('/', postChat)

export default chatRouter
