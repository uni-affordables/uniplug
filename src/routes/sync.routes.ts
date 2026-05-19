import { Router } from 'express'
import { syncProduct } from '../controllers/sync.controller'

const syncRouter = Router()

syncRouter.post('/product', syncProduct)

export default syncRouter
