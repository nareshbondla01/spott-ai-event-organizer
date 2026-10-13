import { internal } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";

/* -------------------------------------------------------------------------- */
/* Get Event Dashboard                                                        */
/* -------------------------------------------------------------------------- */

export const getEventDashboard = query({
    args: {
        eventId: v.id("events"),
    },

    handler: async(ctx, args) => {
        /* ---------------------------------------------------------------------- */
        /* Authentication                                                         */
        /* ---------------------------------------------------------------------- */

        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            throw new Error("User not authenticated.");
        }

        /* ---------------------------------------------------------------------- */
        /* Get Event                                                              */
        /* ---------------------------------------------------------------------- */

        const event = await ctx.db.get(args.eventId);

        if (!event) {
            throw new Error("Event not found.");
        }

        /* ---------------------------------------------------------------------- */
        /* Organizer Authorization                                                */
        /* ---------------------------------------------------------------------- */

        if (event.organizerId !== user._id) {
            throw new Error(
                "You are not authorized to view this dashboard."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Get Registrations                                                      */
        /* ---------------------------------------------------------------------- */

        const registrations = await ctx.db
            .query("registrations")
            .withIndex("by_event", (q) =>
                q.eq("eventId", args.eventId)
            )
            .collect();

        /* ---------------------------------------------------------------------- */
        /* Registration Statistics                                                */
        /* ---------------------------------------------------------------------- */

        const confirmedRegistrations = registrations.filter(
            (registration) =>
            registration.status === "confirmed"
        );

        const totalRegistrations =
            confirmedRegistrations.length;

        const checkedInCount =
            confirmedRegistrations.filter(
                (registration) =>
                registration.checkedIn === true
            ).length;

        const pendingCount =
            totalRegistrations - checkedInCount;

        /* ---------------------------------------------------------------------- */
        /* Capacity                                                               */
        /* ---------------------------------------------------------------------- */

        const capacity = event.capacity;

        const remainingCapacity = Math.max(
            0,
            capacity - totalRegistrations
        );

        const isFull =
            totalRegistrations >= capacity;

        /* ---------------------------------------------------------------------- */
        /* Check-In Rate                                                          */
        /* ---------------------------------------------------------------------- */

        const checkInRate =
            totalRegistrations > 0 ?
            Math.round(
                (checkedInCount /
                    totalRegistrations) *
                100
            ) :
            0;

        /* ---------------------------------------------------------------------- */
        /* Event Timing                                                           */
        /* ---------------------------------------------------------------------- */

        const now = Date.now();

        const timeUntilEvent =
            event.startDate - now;

        const hoursUntilEvent = Math.max(
            0,
            Math.floor(
                timeUntilEvent /
                (1000 * 60 * 60)
            )
        );

        /* ---------------------------------------------------------------------- */
        /* Event Day Information                                                  */
        /* ---------------------------------------------------------------------- */

        const currentDate = new Date(now);
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        const today = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
        ).getTime();

        const startDay = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
        ).getTime();

        const endDay = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate()
        ).getTime();

        const isEventToday =
            today >= startDay &&
            today <= endDay;

        const isEventPast =
            event.endDate < now;

        const isEventUpcoming =
            event.startDate > now;

        /* ---------------------------------------------------------------------- */
        /* Event Status                                                           */
        /* ---------------------------------------------------------------------- */

        let eventStatus = "upcoming";

        if (isEventPast) {
            eventStatus = "past";
        } else if (isEventToday) {
            eventStatus = "today";
        }

        /* ---------------------------------------------------------------------- */
        /* Return Dashboard Data                                                  */
        /* ---------------------------------------------------------------------- */

        return {
            event,

            stats: {
                totalRegistrations,
                checkedInCount,
                pendingCount,

                capacity,
                remainingCapacity,
                isFull,

                checkInRate,

                // All Spott events are free.
                totalRevenue: 0,

                hoursUntilEvent,

                isEventToday,
                isEventPast,
                isEventUpcoming,

                eventStatus,
            },
        };
    },
});