import { type Request, type Response } from 'express'
import { isUnplugAllowed } from '../lib/env'

interface UnplugStatusResponse {
  allowUse: boolean
}

export const getUnplugStatus = (
  _req: Request,
  res: Response<UnplugStatusResponse>
): void => {
  res.status(200).json({
    allowUse: isUnplugAllowed()
  })
}
