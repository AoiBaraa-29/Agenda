import { Event, EventCommittee, type PrismaClient } from '@prisma/client'
import { createCommitteeData } from '../../data/committee/create-committee'
import { createEventData } from '../../data/event/create-event'
import { getUserData } from '../../data/user/get-user'
import { createSentEmailCommitteeData } from '../../data/committee/create-sent-email-committee'
import { sendEmailApprovalService } from './send-email-approval-service'
import { ValidationError } from '../../utils/errors'
import { concatenateStrings } from '../../utils/concatenate-strings'
import { createHistoryLogData } from '../../data/history/create-history-log'

export type CreateEventServiceArgs = {
  prisma: PrismaClient
  committees: EventCommittee[]
  userId: string
  values: Event
}

export const createEventService = async ({
  prisma,
  committees,
  userId,
  values,
}: CreateEventServiceArgs) => {
  const newEvent = await prisma.$transaction(async (prismaTx) => {
    const event = await createEventData({ prisma: prismaTx, values, userId })
    if (!event) throw new ValidationError('Event is not created.')

    const organizer = await getUserData({
      prisma: prismaTx,
      id: event.organizerId,
    })

    const msg = event.status === 'DRAFT' ? 'Draft' : ''
    await createHistoryLogData({
      prisma: prismaTx,
      values: {
        message: `New Event ${msg}`,
        action: 'CREATED',
        email: organizer.email,
        eventId: event.id,
      },
    })

    if (committees.length < 1) {
      return event
    }

    for (const committee of committees) {
      let committeeId, committeeFullName
      let committeeDetails

      try {
        committeeDetails = await getUserData({
          prisma,
          email: committee.email,
        })
      } catch (error) {
        console.log(error)
      }

      await createCommitteeData({
        prisma: prismaTx,
        values: {
          userId: committeeId ?? null,
          name: committeeFullName || null,
          email: committee?.email,
          eventId: event?.id,
        },
      })

      await prismaTx.eventSentEmailCommittee.create({
        data: {
          committeeEmail: committee.email,
          isSent: false,
        },
      })
    }

    for (const newCommittee of committees) {
      let committeeDetails

      try {
        committeeDetails = await getUserData({
          prisma,
          email: newCommittee.email,
        })
      } catch (error) {
        console.log(error)
      }

      await createCommitteeData({
        prisma: prismaTx,
        values: {
          userId: committeeDetails?.id ?? null,
          name:
            concatenateStrings(
              committeeDetails?.firstName,
              committeeDetails?.middleName,
              committeeDetails?.lastName,
            ) || null,
          email: newCommittee.email,
          eventId: event.id,
        },
      })

      await createSentEmailCommitteeData({
        prisma: prismaTx,
        values: {
          committeeEmail: newCommittee.email,
          isSent: false,
        },
      })
    }

    const firstCommittee: string = committees[0]?.email

    await sendEmailApprovalService({
      prisma: prismaTx,
      committeeEmail: firstCommittee,
      eventId: event.id,
    })

    return event
  })

  return newEvent
}
