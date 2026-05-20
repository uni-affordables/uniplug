import { Router } from 'express'
import { getUnplugStatus } from '../controllers/unplug.controller'

const unplugRouter = Router()

unplugRouter.get('/status', getUnplugStatus)

export default unplugRouter
