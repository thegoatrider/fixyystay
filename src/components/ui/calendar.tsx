'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        // v9 classNames — completely different from v8
        months: 'flex flex-col sm:flex-row gap-6',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center items-center relative h-8',
        caption_label: 'text-sm font-bold text-gray-900',
        nav: 'flex items-center gap-1 absolute inset-x-0 top-0 justify-between px-1 h-8',
        button_previous: cn(
          'inline-flex items-center justify-center h-7 w-7 rounded-full border border-gray-200 bg-white',
          'opacity-60 hover:opacity-100 transition-opacity shadow-sm hover:border-blue-300'
        ),
        button_next: cn(
          'inline-flex items-center justify-center h-7 w-7 rounded-full border border-gray-200 bg-white',
          'opacity-60 hover:opacity-100 transition-opacity shadow-sm hover:border-blue-300'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-gray-400 w-9 h-9 flex items-center justify-center text-[11px] font-bold uppercase tracking-wide',
        week: 'flex w-full mt-1',
        day: 'relative p-0 flex-1 flex items-center justify-center text-center [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-blue-50/50 [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
        day_button: cn(
          'h-9 w-9 p-0 font-normal text-sm rounded-md transition-all',
          'hover:bg-blue-50 hover:text-blue-600',
          'aria-selected:opacity-100'
        ),
        selected: 'bg-blue-600 text-white hover:bg-blue-600 rounded-md shadow-md [&>button]:text-white [&>button]:hover:bg-blue-600',
        today: 'bg-gray-100 font-bold text-gray-900 rounded-md',
        outside: 'text-gray-400 opacity-40 [&>button]:text-gray-400',
        disabled: 'text-gray-300 opacity-50 [&>button]:cursor-not-allowed',
        range_middle: 'bg-blue-50 [&>button]:text-blue-700 [&>button]:rounded-none',
        range_start: 'bg-blue-600 rounded-l-md [&>button]:text-white',
        range_end: 'bg-blue-600 rounded-r-md [&>button]:text-white',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
