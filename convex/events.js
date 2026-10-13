import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create an event.
 * Authenticated users can create unlimited free events.
 */
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),
    locationType: v.union(
      v.literal("physical"),
      v.literal("online")
    ),
    venue: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    capacity: v.number(),
    ticketType: v.union(
      v.literal("free"),
      v.literal("paid")
    ),
    ticketPrice: v.optional(v.number()),
    coverImage: v.optional(v.string()),
    themeColor: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    // getCurrentUser is exported as a public query in users.js.
    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user) {
      throw new Error("User not authenticated. Please log in.");
    }

    const title = args.title.trim();
    const description = args.description.trim();

    if (title.length < 5) {
      throw new Error("Event title must be at least 5 characters.");
    }

    if (description.length < 20) {
      throw new Error(
        "Event description must be at least 20 characters."
      );
    }

    if (
      !Number.isFinite(args.startDate) ||
      !Number.isFinite(args.endDate)
    ) {
      throw new Error("Please provide valid event dates.");
    }

    if (args.endDate <= args.startDate) {
      throw new Error(
        "Event end date and time must be after the start date and time."
      );
    }

    if (
      !Number.isFinite(args.capacity) ||
      args.capacity < 1
    ) {
      throw new Error("Event capacity must be at least 1.");
    }

    if (!args.city.trim()) {
      throw new Error("City is required.");
    }

    if (!args.country.trim()) {
      throw new Error("Country is required.");
    }

    if (
      args.ticketType === "paid" &&
      (!Number.isFinite(args.ticketPrice) ||
        args.ticketPrice <= 0)
    ) {
      throw new Error(
        "A valid ticket price is required for paid events."
      );
    }

    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const slug = `${slugBase || "event"}-${Date.now()}`;

    const now = Date.now();

    const eventId = await ctx.db.insert("events", {
      title,
      description,
      category: args.category,
      tags: args.tags,
      startDate: args.startDate,
      endDate: args.endDate,
      timezone: args.timezone,
      locationType: args.locationType,
      venue: args.venue,
      address: args.address,
      city: args.city.trim(),
      state: args.state,
      country: args.country.trim(),
      capacity: Math.floor(args.capacity),
      ticketType: args.ticketType,
      ticketPrice:
        args.ticketType === "paid"
          ? args.ticketPrice
          : undefined,
      coverImage: args.coverImage,
      themeColor: args.themeColor || "#1e3a8a",
      slug,
      organizerId: user._id,
      organizerName: user.name || "Event Organizer",
      registrationCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

/**
 * Get an event by its unique slug.
 */
export const getEventBySlug = query({
  args: {
    slug: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * Get events belonging to the currently logged-in user.
 */
export const getMyEvents = query({
  args: {},

  handler: async (ctx) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) =>
        q.eq("organizerId", user._id)
      )
      .order("desc")
      .collect();
  },
});

/**
 * Delete an event owned by the current user.
 */
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user) {
      throw new Error("User not authenticated. Please log in.");
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    if (event.organizerId !== user._id) {
      throw new Error("You are not authorized to delete this event.");
    }

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }

    await ctx.db.delete(args.eventId);

    return { success: true };
  },
});