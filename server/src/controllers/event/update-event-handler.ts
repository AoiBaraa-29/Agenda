import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { updateEventService } from '../../services/event/update-event-service'

const prisma = new PrismaClient()

export const updateEventHandler = async (req: Request, res: Response) => {
  const { data } = req.body

  if (!data.id) {
    return res.sendStatus(404)
  }

  const parsedPrice = data.price ? parseFloat(data.price) : 0
  const parsedEstimatedAttendees = data.estimatedAttendees
    ? parseInt(data.estimatedAttendees)
    : 0
  const parsedEstimatedExpense = data.estimatedExpense
    ? parseFloat(data.estimatedExpense)
    : 0
  const parsedDate = (value: string) => {
    return value ? new Date(value).toISOString() : null
  }

  const {
    id,
    createdAt,
    updatedAt,
    organizerId,
    organizer,
    committees,
    eventHistoryLogs,
    participants,
    ...rest
  } = data

  const values = {
    ...rest,
    startDateTime: parsedDate(data.startDateTime),
    endDateTime: parsedDate(data.endDateTime),
    category: data.category !== '' ? data.category : 'PERSONAL',
    audience: data.audience !== '' ? data.audience : 'ONLY_ME',
    price: parsedPrice,
    estimatedAttendees: parsedEstimatedAttendees,
    estimatedExpense: parsedEstimatedExpense,
  }

  const event = await updateEventService({
    values,
    committees,
    id,
    prisma,
  })

  return res.status(200).json(event)
}
