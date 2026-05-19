import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from 'express'
import chatRouter from './routes/chat.routes'
import syncRouter from './routes/sync.routes'

type AppError = Error & {
  statusCode?: number
  status?: number
  type?: string
}

const app: Express = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api/chat', chatRouter)
app.use('/api/sync', syncRouter)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found.' })
})

app.use((error: AppError, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON payload.' })
    return
  }

  const statusCode = error.statusCode ?? error.status ?? 500
  const message = statusCode >= 500
    ? 'An unexpected server error occurred.'
    : error.message

  if (statusCode >= 500) {
    console.error('[uniplug-api]', error)
  }

  res.status(statusCode).json({ error: message })
})

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000)

  app.listen(port, () => {
    console.log(`UniPlug API listening on port ${port}`)
  })
}

export default app
