import { type NextFunction, type Request, type Response } from 'express'
import { uniPlugService } from '../services/unplug.service'
import type { ChatApiResponse, ChatRequestBody, ChatRole } from '../types/chat'

class HttpError extends Error {
  constructor (
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

type AsyncHandler<TRequest extends Request = Request, TResponse extends Response = Response> = (
  req: TRequest,
  res: TResponse,
  next: NextFunction
) => Promise<void>

const asyncHandler = <
  TRequest extends Request = Request,
  TResponse extends Response = Response
>(handler: AsyncHandler<TRequest, TResponse>) => (
  req: TRequest,
  res: TResponse,
  next: NextFunction
): void => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

const VALID_ROLES = new Set<ChatRole>(['user', 'model'])

const isChatRequestBody = (value: unknown): value is ChatRequestBody => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (typeof candidate.message !== 'string') {
    return false
  }

  if (!Array.isArray(candidate.chatHistory)) {
    return false
  }

  return candidate.chatHistory.every((entry) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return false
    }

    const message = entry as Record<string, unknown>

    if (!VALID_ROLES.has(message.role as ChatRole)) {
      return false
    }

    if (!Array.isArray(message.parts)) {
      return false
    }

    return message.parts.every((part) => (
      part != null &&
      typeof part === 'object' &&
      !Array.isArray(part) &&
      typeof (part as Record<string, unknown>).text === 'string'
    ))
  })
}

export const postChat = asyncHandler(async (
  req: Request<Record<string, never>, ChatApiResponse, ChatRequestBody>,
  res: Response<ChatApiResponse>
) => {
  if (!isChatRequestBody(req.body)) {
    throw new HttpError(
      400,
      'Invalid request body. Expected { message: string, chatHistory: Array<{ role, parts }> }.'
    )
  }

  const message = req.body.message.trim()

  if (message.length === 0) {
    throw new HttpError(400, 'Message cannot be empty.')
  }

  if (message.length > 2000) {
    throw new HttpError(400, 'Message exceeds the 2000 character limit.')
  }

  if (req.body.chatHistory.length > 20) {
    throw new HttpError(400, 'chatHistory cannot exceed 20 turns.')
  }

  const responsePayload = await uniPlugService.generateReply({
    message,
    chatHistory: req.body.chatHistory
  })

  res.status(200).json(responsePayload)
})
