"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";

import { cn } from "@/lib/utils";
import {
  Button,
  buttonVariants,
} from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}) {
  const defaultClassNames =
    getDefaultClassNames();

  return (
    <DayPicker
      {...props}
      showOutsideDays={
        showOutsideDays
      }
      captionLayout={
        captionLayout
      }
      formatters={{
        formatMonthDropdown: (
          date
        ) =>
          date.toLocaleString(
            "default",
            {
              month: "short",
            }
          ),
        ...formatters,
      }}
      className={cn(
        "bg-background p-3 rounded-md",
        className
      )}
      classNames={{
        root: cn(
          "w-fit",
          defaultClassNames.root
        ),

        months: cn(
          "flex flex-col md:flex-row gap-4",
          defaultClassNames.months
        ),

        month: cn(
          "flex flex-col gap-4",
          defaultClassNames.month
        ),

        month_caption: cn(
          "flex items-center justify-center h-8 relative",
          defaultClassNames.month_caption
        ),

        caption_label: cn(
          "text-sm font-medium",
          defaultClassNames.caption_label
        ),

        nav: cn(
          "flex items-center justify-between absolute top-0 left-0 right-0",
          defaultClassNames.nav
        ),

        button_previous: cn(
          buttonVariants({
            variant:
              buttonVariant,
          }),
          "h-8 w-8 p-0",
          defaultClassNames.button_previous
        ),

        button_next: cn(
          buttonVariants({
            variant:
              buttonVariant,
          }),
          "h-8 w-8 p-0",
          defaultClassNames.button_next
        ),

        weekdays: cn(
          "flex mt-2",
          defaultClassNames.weekdays
        ),

        weekday: cn(
          "flex-1 text-center text-xs font-normal text-muted-foreground",
          defaultClassNames.weekday
        ),

        week: cn(
          "flex w-full mt-1",
          defaultClassNames.week
        ),

        day: cn(
          "relative flex-1 aspect-square p-0 text-center",
          defaultClassNames.day
        ),

        day_button: cn(
          "w-full h-full rounded-md",
          defaultClassNames.day_button
        ),

        selected: cn(
          "bg-primary text-primary-foreground",
          defaultClassNames.selected
        ),

        today: cn(
          "bg-accent text-accent-foreground",
          defaultClassNames.today
        ),

        outside: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.outside
        ),

        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),

        hidden: cn(
          "invisible",
          defaultClassNames.hidden
        ),

        ...classNames,
      }}
      components={{
        Chevron: ({
          orientation,
          className,
          ...props
        }) => {
          if (
            orientation ===
            "left"
          ) {
            return (
              <ChevronLeftIcon
                className={cn(
                  "h-4 w-4",
                  className
                )}
                {...props}
              />
            );
          }

          if (
            orientation ===
            "right"
          ) {
            return (
              <ChevronRightIcon
                className={cn(
                  "h-4 w-4",
                  className
                )}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn(
                "h-4 w-4",
                className
              )}
              {...props}
            />
          );
        },

        /*
         * IMPORTANT:
         *
         * Use a normal <button> here instead
         * of the custom Shadcn Button.
         *
         * This allows react-day-picker to
         * control the date button directly.
         */
        DayButton: ({
          className,
          day,
          modifiers,
          ...props
        }) => {
          const ref =
            React.useRef(null);

          React.useEffect(() => {
            if (
              modifiers?.focused
            ) {
              ref.current?.focus();
            }
          }, [
            modifiers?.focused,
          ]);

          return (
            <button
              ref={ref}
              type="button"
              {...props}
              className={cn(
                "inline-flex items-center justify-center",
                "h-9 w-9 rounded-md",
                "text-sm font-normal",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                "data-[selected-single=true]:bg-primary",
                "data-[selected-single=true]:text-primary-foreground",
                "data-[selected-single=true]:hover:bg-primary",
                "data-[selected-single=true]:hover:text-primary-foreground",
                "data-[today=true]:bg-accent",
                "data-[today=true]:text-accent-foreground",
                className
              )}
              data-day={day?.date
                ? day.date.toLocaleDateString()
                : undefined}
              data-selected-single={
                modifiers?.selected &&
                !modifiers?.range_start &&
                !modifiers?.range_end &&
                !modifiers?.range_middle
                  ? "true"
                  : undefined
              }
              data-range-start={
                modifiers?.range_start
                  ? "true"
                  : undefined
              }
              data-range-end={
                modifiers?.range_end
                  ? "true"
                  : undefined
              }
              data-range-middle={
                modifiers?.range_middle
                  ? "true"
                  : undefined
              }
            >
              {props.children}
            </button>
          );
        },

        WeekNumber: ({
          children,
          ...props
        }) => (
          <td {...props}>
            <div className="flex h-9 w-9 items-center justify-center text-center text-sm">
              {children}
            </div>
          </td>
        ),

        ...components,
      }}
    />
  );
}

Calendar.displayName =
  "Calendar";

export {
  Calendar,
};  