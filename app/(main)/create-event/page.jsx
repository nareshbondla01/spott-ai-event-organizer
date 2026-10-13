"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { State, City } from "country-state-city";
import {
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";

import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import UnsplashImagePicker from "@/components/unsplash-image-picker";
import AIEventCreator from "./_components/ai-event-creator";

import { CATEGORIES } from "@/lib/data";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_THEME_COLOR = "#1e3a8a";
const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/* -------------------------------------------------------------------------- */
/* Date Helpers                                                               */
/* -------------------------------------------------------------------------- */

function dateToInputValue(date) {
  if (!(date instanceof Date)) {
    return "";
  }

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function inputValueToDate(value) {
  if (!value) {
    return null;
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
}

function combineDateTime(date, time) {
  if (!(date instanceof Date)) {
    return null;
  }

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    typeof time !== "string" ||
    !time
  ) {
    return null;
  }

  const parts = time.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date(date);

  result.setHours(
    hours,
    minutes,
    0,
    0
  );

  return result;
}

/* -------------------------------------------------------------------------- */
/* Image Compression                                                          */
/* -------------------------------------------------------------------------- */

function compressImage(file) {
  return new Promise(
    (resolve, reject) => {
      if (!file) {
        reject(
          new Error(
            "No image selected."
          )
        );
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        reject(
          new Error(
            "Please select an image file."
          )
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const image =
          new window.Image();

        image.onload = () => {
          let width = image.width;
          let height = image.height;

          const maxWidth = 1200;
          const maxHeight = 1200;

          const scale = Math.min(
            1,
            maxWidth / width,
            maxHeight / height
          );

          width = Math.round(
            width * scale
          );

          height = Math.round(
            height * scale
          );

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Unable to process image."
              )
            );
            return;
          }

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          const dataUrl =
            canvas.toDataURL(
              "image/jpeg",
              0.78
            );

          resolve(dataUrl);
        };

        image.onerror = () => {
          reject(
            new Error(
              "Unable to load image."
            )
          );
        };

        image.src = reader.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read image."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Create Event Page                                                          */
/* -------------------------------------------------------------------------- */

export default function CreateEventPage() {
  const router = useRouter();

  const [
    showImagePicker,
    setShowImagePicker,
  ] = useState(false);

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  const {
    mutate: createEvent,
    isLoading,
  } = useConvexMutation(
    api.events.createEvent
  );

  /* ------------------------------------------------------------------------ */
  /* Form                                                                     */
  /* ------------------------------------------------------------------------ */

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
  } = useForm({
    shouldUnregister: false,

    defaultValues: {
      title: "",
      description: "",
      category: "",

      startDate: null,
      endDate: null,

      startTime:
        DEFAULT_START_TIME,

      endTime:
        DEFAULT_END_TIME,

      locationType:
        "physical",

      venue: "",
      address: "",
      city: "",
      state: "",

      capacity: 50,

      coverImage: "",

      themeColor:
        DEFAULT_THEME_COLOR,
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Watched Values                                                           */
  /* ------------------------------------------------------------------------ */

  const selectedState =
    watch("state");

  const startDate =
    watch("startDate");

  const coverImage =
    watch("coverImage");

  const themeColor =
    watch("themeColor");

  /* ------------------------------------------------------------------------ */
  /* Indian States                                                            */
  /* ------------------------------------------------------------------------ */

  const indianStates =
    useMemo(
      () =>
        State.getStatesOfCountry(
          "IN"
        ),
      []
    );

  /* ------------------------------------------------------------------------ */
  /* Cities                                                                   */
  /* ------------------------------------------------------------------------ */

  const cities = useMemo(() => {
    if (!selectedState) {
      return [];
    }

    const state =
      indianStates.find(
        (item) =>
          item.name ===
          selectedState
      );

    if (!state) {
      return [];
    }

    return City.getCitiesOfState(
      "IN",
      state.isoCode
    );
  }, [
    selectedState,
    indianStates,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Theme Colors                                                             */
  /* ------------------------------------------------------------------------ */

  const colorPresets = [
    "#1e3a8a",
    "#4c1d95",
    "#065f46",
    "#92400e",
    "#7f1d1d",
    "#831843",
    "#0f766e",
    "#1d4ed8",
  ];

  function handleColorClick(color) {
    setValue(
      "themeColor",
      color,
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Start Date                                                               */
  /* ------------------------------------------------------------------------ */

  function handleStartDateChange(
    date
  ) {
    setValue(
      "startDate",
      date,
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );

    if (!date) {
      return;
    }

    const currentEndDate =
      watch("endDate");

    if (
      !currentEndDate ||
      currentEndDate < date
    ) {
      setValue(
        "endDate",
        new Date(date),
        {
          shouldDirty: true,
          shouldTouch: true,
        }
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* End Date                                                                 */
  /* ------------------------------------------------------------------------ */

  function handleEndDateChange(
    date
  ) {
    setValue(
      "endDate",
      date,
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Gallery Image                                                            */
  /* ------------------------------------------------------------------------ */

  async function handleGalleryImage(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setUploadingImage(true);

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        throw new Error(
          "Please choose an image smaller than 10 MB."
        );
      }

      const compressedImage =
        await compressImage(file);

      setValue(
        "coverImage",
        compressedImage,
        {
          shouldDirty: true,
          shouldTouch: true,
        }
      );

      toast.success(
        "Event cover image selected."
      );
    } catch (error) {
      console.error(
        "Gallery image error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to use this image."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Remove Image                                                             */
  /* ------------------------------------------------------------------------ */

  function handleRemoveImage() {
    setValue(
      "coverImage",
      "",
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* AI Generation                                                            */
  /* ------------------------------------------------------------------------ */

  function handleAIGenerate(
    generatedData
  ) {
    if (!generatedData) {
      return;
    }

    if (
      typeof generatedData.title ===
        "string" &&
      generatedData.title.trim()
    ) {
      setValue(
        "title",
        generatedData.title,
        {
          shouldDirty: true,
        }
      );
    }

    if (
      typeof generatedData.description ===
        "string" &&
      generatedData.description.trim()
    ) {
      setValue(
        "description",
        generatedData.description,
        {
          shouldDirty: true,
        }
      );
    }

    if (
      typeof generatedData.category ===
        "string" &&
      generatedData.category
    ) {
      const categoryExists =
        CATEGORIES.some(
          (category) =>
            category.id ===
            generatedData.category
        );

      if (categoryExists) {
        setValue(
          "category",
          generatedData.category,
          {
            shouldDirty: true,
          }
        );
      }
    }

    if (
      generatedData.suggestedCapacity !==
        undefined &&
      generatedData.suggestedCapacity !==
        null
    ) {
      const generatedCapacity =
        Number(
          generatedData.suggestedCapacity
        );

      if (
        Number.isFinite(
          generatedCapacity
        ) &&
        generatedCapacity > 0
      ) {
        setValue(
          "capacity",
          Math.floor(
            generatedCapacity
          ),
          {
            shouldDirty: true,
          }
        );
      }
    }

    toast.success(
      "Event details filled! Customize as needed."
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  async function onSubmit(data) {
    try {
      console.log(
        "CREATE EVENT FORM DATA:",
        data
      );

      /* -------------------------------------------------------------------- */
      /* Title                                                                */
      /* -------------------------------------------------------------------- */

      const title = String(
        data.title ?? ""
      ).trim();

      if (title.length < 5) {
        toast.error(
          "Title must be at least 5 characters."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Description                                                          */
      /* -------------------------------------------------------------------- */

      const description = String(
        data.description ?? ""
      ).trim();

      if (description.length < 20) {
        toast.error(
          "Description must be at least 20 characters."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Category                                                             */
      /* -------------------------------------------------------------------- */

      const category = String(
        data.category ?? ""
      ).trim();

      if (!category) {
        toast.error(
          "Please select a category."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Dates                                                                */
      /* -------------------------------------------------------------------- */

      if (
        !(data.startDate instanceof Date)
      ) {
        toast.error(
          "Please select a start date."
        );
        return;
      }

      if (
        !(data.endDate instanceof Date)
      ) {
        toast.error(
          "Please select an end date."
        );
        return;
      }

      const start =
        combineDateTime(
          data.startDate,
          data.startTime ||
            DEFAULT_START_TIME
        );

      const end =
        combineDateTime(
          data.endDate,
          data.endTime ||
            DEFAULT_END_TIME
        );

      if (!start || !end) {
        toast.error(
          "Please select valid dates and times."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Start cannot be in the past                                         */
      /* -------------------------------------------------------------------- */

      if (
        start.getTime() <
        Date.now()
      ) {
        toast.error(
          "Start date and time cannot be in the past."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* End after Start                                                      */
      /* -------------------------------------------------------------------- */

      if (
        end.getTime() <=
        start.getTime()
      ) {
        toast.error(
          "End date and time must be after start date and time."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* City                                                                 */
      /* -------------------------------------------------------------------- */

      const city = String(
        data.city ?? ""
      ).trim();

      if (!city) {
        toast.error(
          "Please select a city."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Optional Location Values                                             */
      /* -------------------------------------------------------------------- */

      const state = String(
        data.state ?? ""
      ).trim();

      const venue = String(
        data.venue ?? ""
      ).trim();

      const address = String(
        data.address ?? ""
      ).trim();

      /* -------------------------------------------------------------------- */
      /* Capacity                                                             */
      /* -------------------------------------------------------------------- */

      const capacity = Number(
        data.capacity
      );

      if (
        !Number.isFinite(
          capacity
        ) ||
        capacity < 1
      ) {
        toast.error(
          "Capacity must be at least 1."
        );
        return;
      }

      /* -------------------------------------------------------------------- */
      /* Theme Color                                                          */
      /* -------------------------------------------------------------------- */

      const selectedThemeColor =
        String(
          data.themeColor ??
            DEFAULT_THEME_COLOR
        ).trim() ||
        DEFAULT_THEME_COLOR;

      /* -------------------------------------------------------------------- */
      /* Location Type                                                        */
      /* -------------------------------------------------------------------- */

      const locationType =
        data.locationType ===
        "online"
          ? "online"
          : "physical";

      /* -------------------------------------------------------------------- */
      /* Cover Image                                                          */
      /* -------------------------------------------------------------------- */

      const selectedCoverImage =
        typeof data.coverImage ===
        "string"
          ? data.coverImage
          : "";

      /* -------------------------------------------------------------------- */
      /* Convex Payload                                                       */
      /* -------------------------------------------------------------------- */

      const eventData = {
        title,

        description,

        category,

        tags: [category],

        startDate:
          start.getTime(),

        endDate:
          end.getTime(),

        timezone:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone ||
          "Asia/Kolkata",

        locationType,

        venue:
          venue || undefined,

        address:
          address || undefined,

        city,

        state:
          state || undefined,

        country:
          "India",

        capacity:
          Math.floor(capacity),

        /*
         * Spott events are completely free.
         */
        ticketType: "free",

        coverImage:
          selectedCoverImage ||
          undefined,

        themeColor:
          selectedThemeColor,
      };

      console.log(
        "SENDING TO CONVEX:",
        eventData
      );

      await createEvent(
        eventData
      );

      toast.success(
        "Event created successfully! 🎉"
      );

      router.push(
        "/my-events"
      );
    } catch (error) {
      console.error(
        "CREATE EVENT ERROR:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to create event."
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Minimum Dates                                                            */
  /* ------------------------------------------------------------------------ */

  const todayString =
    dateToInputValue(
      new Date()
    );

  const endMinimumDate =
    startDate instanceof Date
      ? dateToInputValue(
          startDate
        )
      : todayString;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      className="min-h-screen transition-colors duration-300 px-6 py-8 -mt-6 md:-mt-16 lg:-mt-5 lg:rounded-md"
      style={{
        backgroundColor:
          themeColor ||
          DEFAULT_THEME_COLOR,
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="max-w-6xl mx-auto flex flex-col gap-5 md:flex-row justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold">
            Create Event
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Create unlimited
            events for free.
          </p>
        </div>

        <AIEventCreator
          onEventGenerated={
            handleAIGenerate
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Content                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[320px_1fr] gap-10">

        {/* ---------------------------------------------------------------- */}
        {/* Left Side                                                        */}
        {/* ---------------------------------------------------------------- */}

        <div className="space-y-6">

          {/* Cover Image */}

          <div className="space-y-3">
            <Label>
              Event Cover Image
            </Label>

            <div
              className="relative aspect-square w-full rounded-xl overflow-hidden flex items-center justify-center cursor-pointer border bg-black/10"
              onClick={() => {
                if (
                  !uploadingImage
                ) {
                  setShowImagePicker(
                    true
                  );
                }
              }}
            >
              {coverImage ? (
                <>
                  <Image
                    src={
                      coverImage
                    }
                    alt="Event cover"
                    width={600}
                    height={600}
                    unoptimized
                    priority
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-end justify-center">
                    <span className="opacity-0 hover:opacity-100 text-white bg-black/60 rounded-md px-3 py-2 mb-4 text-sm">
                      Change image
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <ImagePlus className="w-10 h-10 mx-auto mb-3 opacity-60" />

                  <span className="opacity-70 text-sm block">
                    Choose event
                    cover image
                  </span>

                  <p className="text-xs text-muted-foreground mt-2">
                    Upload from
                    gallery or
                    choose from
                    Unsplash
                  </p>
                </div>
              )}
            </div>

            {/* Image Buttons */}

            <div className="grid grid-cols-2 gap-2">

              {/* Gallery */}

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={
                    handleGalleryImage
                  }
                  disabled={
                    uploadingImage
                  }
                />

                <span className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Gallery
                    </>
                  )}
                </span>
              </label>

              {/* Unsplash */}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setShowImagePicker(
                    true
                  )
                }
                disabled={
                  uploadingImage
                }
                className="gap-2"
              >
                <ImagePlus className="w-4 h-4" />
                Unsplash
              </Button>
            </div>

            {/* Remove */}

            {coverImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={
                  handleRemoveImage
                }
                className="w-full gap-2 text-red-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
                Remove Cover Image
              </Button>
            )}
          </div>

          {/* Theme Color */}

          <div className="space-y-2">
            <Label className="text-sm">
              Theme Color
            </Label>

            <div className="flex gap-2 flex-wrap">
              {colorPresets.map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-10 h-10 rounded-full border-2 hover:scale-110 transition-all"
                    style={{
                      backgroundColor:
                        color,
                      borderColor:
                        themeColor ===
                        color
                          ? "white"
                          : "transparent",
                    }}
                    onClick={() =>
                      handleColorClick(
                        color
                      )
                    }
                    aria-label={`Select theme color ${color}`}
                  />
                )
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Choose any theme
              color for your
              event.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right Form                                                       */}
        {/* ---------------------------------------------------------------- */}

        <form
          onSubmit={handleSubmit(
            onSubmit
          )}
          className="space-y-8"
        >

          {/* Title */}

          <div className="space-y-2">
            <Label>
              Event Name
            </Label>

            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <Input
                  value={
                    field.value ?? ""
                  }
                  onChange={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  ref={
                    field.ref
                  }
                  placeholder="Enter event name"
                  className="text-3xl font-semibold bg-transparent border-none focus-visible:ring-0"
                />
              )}
            />
          </div>

          {/* Date + Time */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* START */}

            <div className="space-y-2">
              <Label className="text-sm">
                Start
              </Label>

              <div className="grid grid-cols-[1fr_auto] gap-2">

                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <Input
                      type="date"
                      value={dateToInputValue(
                        field.value
                      )}
                      min={
                        todayString
                      }
                      onChange={(
                        event
                      ) => {
                        const selectedDate =
                          inputValueToDate(
                            event
                              .target
                              .value
                          );

                        field.onChange(
                          selectedDate
                        );

                        if (
                          selectedDate
                        ) {
                          const currentEndDate =
                            watch(
                              "endDate"
                            );

                          if (
                            !currentEndDate ||
                            currentEndDate <
                              selectedDate
                          ) {
                            setValue(
                              "endDate",
                              new Date(
                                selectedDate
                              ),
                              {
                                shouldDirty:
                                  true,
                                shouldTouch:
                                  true,
                              }
                            );
                          }
                        }
                      }}
                      onBlur={
                        field.onBlur
                      }
                      ref={
                        field.ref
                      }
                      className="w-full"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    <Input
                      type="time"
                      value={
                        field.value ||
                        DEFAULT_START_TIME
                      }
                      onChange={
                        field.onChange
                      }
                      onBlur={
                        field.onBlur
                      }
                      ref={
                        field.ref
                      }
                    />
                  )}
                />
              </div>
            </div>

            {/* END */}

            <div className="space-y-2">
              <Label className="text-sm">
                End
              </Label>

              <div className="grid grid-cols-[1fr_auto] gap-2">

                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <Input
                      type="date"
                      value={dateToInputValue(
                        field.value
                      )}
                      min={
                        endMinimumDate
                      }
                      onChange={(
                        event
                      ) => {
                        const selectedDate =
                          inputValueToDate(
                            event
                              .target
                              .value
                          );

                        field.onChange(
                          selectedDate
                        );
                      }}
                      onBlur={
                        field.onBlur
                      }
                      ref={
                        field.ref
                      }
                      className="w-full"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <Input
                      type="time"
                      value={
                        field.value ||
                        DEFAULT_END_TIME
                      }
                      onChange={
                        field.onChange
                      }
                      onBlur={
                        field.onBlur
                      }
                      ref={
                        field.ref
                      }
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Category */}

          <div className="space-y-2">
            <Label>
              Category
            </Label>

            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={
                    field.value || ""
                  }
                  onValueChange={
                    field.onChange
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIES.map(
                      (category) => (
                        <SelectItem
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {category.icon}{" "}
                          {
                            category.label
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Location */}

          <div className="space-y-3">
            <Label>
              Location
            </Label>

            <Controller
              control={control}
              name="locationType"
              render={({ field }) => (
                <Select
                  value={
                    field.value ||
                    "physical"
                  }
                  onValueChange={
                    field.onChange
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Location type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="physical">
                      Physical Event
                    </SelectItem>

                    <SelectItem value="online">
                      Online Event
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            {/* State */}

            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Select
                  value={
                    field.value || ""
                  }
                  onValueChange={(
                    value
                  ) => {
                    field.onChange(
                      value
                    );

                    setValue(
                      "city",
                      "",
                      {
                        shouldDirty:
                          true,
                        shouldTouch:
                          true,
                      }
                    );
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>

                  <SelectContent>
                    {indianStates.map(
                      (state) => (
                        <SelectItem
                          key={
                            state.isoCode
                          }
                          value={
                            state.name
                          }
                        >
                          {
                            state.name
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />

            {/* City */}

            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Select
                  value={
                    field.value || ""
                  }
                  onValueChange={
                    field.onChange
                  }
                  disabled={
                    !selectedState
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        selectedState
                          ? "Select city"
                          : "Select state first"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {cities.map(
                      (city) => (
                        <SelectItem
                          key={`${city.name}-${city.stateCode}`}
                          value={
                            city.name
                          }
                        >
                          {
                            city.name
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />

            {/* Venue */}

            <Controller
              control={control}
              name="venue"
              render={({ field }) => (
                <Input
                  value={
                    field.value ?? ""
                  }
                  onChange={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  ref={
                    field.ref
                  }
                  placeholder="Venue name or Google Maps link"
                />
              )}
            />

            {/* Address */}

            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <Input
                  value={
                    field.value ?? ""
                  }
                  onChange={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  ref={
                    field.ref
                  }
                  placeholder="Full address / street / building"
                />
              )}
            />
          </div>

          {/* Description */}

          <div className="space-y-2">
            <Label>
              Description
            </Label>

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Textarea
                  value={
                    field.value ?? ""
                  }
                  onChange={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  ref={
                    field.ref
                  }
                  placeholder="Tell people about your event..."
                  rows={6}
                />
              )}
            />
          </div>

          {/* Tickets */}

          <div className="space-y-2">
            <Label>
              Tickets
            </Label>

            <div className="rounded-lg border p-4">
              <p className="font-medium text-green-600">
                Free Event
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                All Spott events
                are free.
                Attendees can
                register without
                payment.
              </p>
            </div>
          </div>

          {/* Capacity */}

          <div className="space-y-2">
            <Label>
              Capacity
            </Label>

            <Controller
              control={control}
              name="capacity"
              render={({ field }) => (
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    field.value ?? 50
                  }
                  onChange={(
                    event
                  ) => {
                    const raw =
                      event.target
                        .value;

                    if (raw === "") {
                      field.onChange(50);
                      return;
                    }

                    const value =
                      Number(raw);

                    field.onChange(
                      Number.isFinite(
                        value
                      )
                        ? value
                        : 50
                    );
                  }}
                  onBlur={
                    field.onBlur
                  }
                  ref={
                    field.ref
                  }
                  placeholder="Ex: 100"
                />
              )}
            />
          </div>

          {/* Submit */}

          <Button
            type="submit"
            disabled={
              isLoading ||
              uploadingImage
            }
            className="w-full py-6 text-lg rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Unsplash Picker                                                    */}
      {/* ------------------------------------------------------------------ */}

      <UnsplashImagePicker
        isOpen={
          showImagePicker
        }
        onClose={() =>
          setShowImagePicker(
            false
          )
        }
        onSelect={(url) => {
          setValue(
            "coverImage",
            url || "",
            {
              shouldDirty: true,
              shouldTouch: true,
            }
          );

          setShowImagePicker(
            false
          );
        }}
      />
    </div>
  );
}