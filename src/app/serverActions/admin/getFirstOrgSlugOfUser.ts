"use server"
// @/app/serverActions/admin/getFirstOrgSlugOfUser.ts

import { db } from "@/db"

export async function getFirstOrgSlugOfUser(userId: string) {
    // Find the oldest org membership where user has admin/owner privileges
    const oldestMembership = await db.member.findFirst({
        where: {
            userId: userId,
            role: {
                in: ['admin', 'owner', 'superadmin'] // Fixed: proper role filtering
            }
        },
        orderBy: {
            createdAt: 'asc' // Get the OLDEST membership
        },
        include: {
            organization: {
                select: {
                    slug: true
                }
            }
        }
    })

    if (!oldestMembership) {
        throw new Error("User has no admin/owner organization memberships")
    }

    if (!oldestMembership.organization?.slug) {
        throw new Error("Organization slug not found")
    }

    return oldestMembership.organization.slug
}