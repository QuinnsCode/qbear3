"use server"
// @/app/serverActions/admin/getFirstOrgSlugOfUser.ts

import { db } from "@/db"

export async function getFirstOrgSlugOfUser(userId: string): Promise<string | null> {
    // Find the oldest org membership for the user (any role)
    const oldestMembership = await db.member.findFirst({
        where: {
            userId: userId,
        },
        orderBy: {
            createdAt: 'asc'
        },
        include: {
            organization: {
                select: {
                    slug: true
                }
            }
        }
    })

    return oldestMembership?.organization?.slug ?? null
}