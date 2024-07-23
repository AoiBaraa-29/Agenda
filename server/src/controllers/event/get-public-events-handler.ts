import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { getEventsData } from '../../data/event/get-events'

const prisma = new PrismaClient()

export const getPublicEventsHandler = async (req: Request, res: Response) => {
  const records = await getEventsData({
    prisma,
    where: {
      AND: [
        { audience: { equals: 'PUBLIC' } },
        { status: { equals: 'UPCOMING' } },
      ],
    },
    sortBy: 'startDateTime',
    orderBy: 'asc',
    include: { participants: true, organizer: true },
  })

  res.status(200).json({ records })
}
