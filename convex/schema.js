import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
    /* ------------------------------------------------------------------------ */
    /* Users                                                                    */
    /* ------------------------------------------------------------------------ */

    users: defineTable({
            email: v.string(),

            clerkId: v.string(),

            tokenIdentifier: v.optional(v.string()),

            name: v.string(),

            imageUrl: v.optional(v.string()),

            hasCompletedOnboarding: v.boolean(),

            location: v.optional(
                v.object({
                    city: v.string(),
                    state: v.optional(v.string()),
                    country: v.string(),
                })
            ),

            interests: v.optional(v.array(v.string())),

            /*
             * Legacy field.
             *
             * IMPORTANT:
             * This field is NOT used to limit event creation.
             *
             * Users can create unlimited events.
             */
            freeEventsCreated: v.optional(v.number()),

            createdAt: v.number(),

            updatedAt: v.number(),
        })
        .index("by_clerkId", ["clerkId"])
        .index("by_token", ["tokenIdentifier"]),

    /* ------------------------------------------------------------------------ */
    /* Events                                                                   */
    /* ------------------------------------------------------------------------ */

    events: defineTable({
            /* ---------------------------------------------------------------------- */
            /* Basic Event Information                                                */
            /* ---------------------------------------------------------------------- */

            title: v.string(),

            description: v.string(),

            slug: v.string(),

            /* ---------------------------------------------------------------------- */
            /* Organizer                                                              */
            /* ---------------------------------------------------------------------- */

            organizerId: v.id("users"),

            organizerName: v.string(),

            /* ---------------------------------------------------------------------- */
            /* Category                                                               */
            /* ---------------------------------------------------------------------- */

            category: v.string(),

            tags: v.array(v.string()),

            /* ---------------------------------------------------------------------- */
            /* Date and Time                                                          */
            /* ---------------------------------------------------------------------- */

            startDate: v.number(),

            endDate: v.number(),

            timezone: v.string(),

            /* ---------------------------------------------------------------------- */
            /* Location                                                               */
            /* ---------------------------------------------------------------------- */

            locationType: v.union(
                v.literal("physical"),
                v.literal("online")
            ),

            venue: v.optional(v.string()),

            address: v.optional(v.string()),

            city: v.string(),

            state: v.optional(v.string()),

            country: v.string(),

            /* ---------------------------------------------------------------------- */
            /* Capacity                                                               */
            /* ---------------------------------------------------------------------- */

            capacity: v.number(),

            /* ---------------------------------------------------------------------- */
            /* Tickets                                                                */
            /* ---------------------------------------------------------------------- */

            /*
             * Kept as free/paid for compatibility with existing
             * event documents in the database.
             *
             * IMPORTANT:
             * New events are ALWAYS created with:
             *
             * ticketType: "free"
             *
             * The application no longer provides a paid-event option.
             */
            ticketType: v.union(
                v.literal("free"),
                v.literal("paid")
            ),

            /*
             * Legacy field.
             *
             * New events do not use ticketPrice.
             */
            ticketPrice: v.optional(v.number()),

            /* ---------------------------------------------------------------------- */
            /* Registration                                                           */
            /* ---------------------------------------------------------------------- */

            registrationCount: v.number(),

            /* ---------------------------------------------------------------------- */
            /* Event Image                                                            */
            /* ---------------------------------------------------------------------- */

            /*
             * Can contain:
             *
             * 1. Unsplash image URL
             * 2. Gallery image data URL
             * 3. Convex Storage image URL
             *
             * This allows users to choose an image for their event.
             */
            coverImage: v.optional(v.string()),

            /* ---------------------------------------------------------------------- */
            /* Theme                                                                  */
            /* ---------------------------------------------------------------------- */

            /*
             * Available to every user.
             *
             * No Pro restriction.
             */
            themeColor: v.optional(v.string()),

            /* ---------------------------------------------------------------------- */
            /* Timestamps                                                             */
            /* ---------------------------------------------------------------------- */

            createdAt: v.number(),

            updatedAt: v.number(),
        })
        .index("by_organizer", ["organizerId"])
        .index("by_category", ["category"])
        .index("by_start_date", ["startDate"])
        .index("by_slug", ["slug"])
        .searchIndex("search_title", {
            searchField: "title",
        }),

    /* ------------------------------------------------------------------------ */
    /* Registrations                                                            */
    /* ------------------------------------------------------------------------ */

    registrations: defineTable({
            eventId: v.id("events"),

            userId: v.id("users"),

            attendeeName: v.string(),

            attendeeEmail: v.string(),

            /*
             * Unique ticket identifier encoded into the attendee's QR code.
             */
            qrCode: v.string(),

            checkedIn: v.boolean(),

            checkedInAt: v.optional(v.number()),

            status: v.union(
                v.literal("confirmed"),
                v.literal("cancelled")
            ),

            registeredAt: v.number(),
        })
        .index("by_event", ["eventId"])
        .index("by_user", ["userId"])
        .index("by_event_user", [
            "eventId",
            "userId",
        ])
        .index("by_qr_code", ["qrCode"]),
});

export default schema;