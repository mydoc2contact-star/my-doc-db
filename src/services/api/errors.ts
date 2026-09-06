import { translateApiMessage } from './errorMessages'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return translateApiMessage(error.message)
  if (error instanceof Error) return translateApiMessage(error.message)
  return 'حدث خطأ غير متوقع'
}
