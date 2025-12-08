import React, { useMemo } from 'react';
import { getUCOREBadgeColor } from '../utils/courseHelpers';

/**
 * WeeklyCalendar - Visual weekly schedule grid showing course time blocks
 * Parses course dayTime like "MWF 10:00-10:50" and renders colored blocks
 */
export default function WeeklyCalendar({ courses }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const DAY_CODES = { M: 0, T: 1, W: 2, R: 3, F: 4 };
  const START_HOUR = 7; // 7am
  const END_HOUR = 21; // 9pm
  const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  /**
   * Parse course dayTime into structured time blocks
   * Examples: "MWF 10:00-10:50", "TR 13:30-14:45", "M 09:00-11:50"
   */
  const parseDayTime = (dayTime) => {
    if (!dayTime) return [];
    
    const match = dayTime.match(/^([MTWRF]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!match) return [];

    const [_, days, startHour, startMin, endHour, endMin] = match;
    const startTime = parseInt(startHour) + parseInt(startMin) / 60;
    const endTime = parseInt(endHour) + parseInt(endMin) / 60;

    // Convert day codes to indices
    const dayIndices = days.split('').map(d => DAY_CODES[d]).filter(i => i !== undefined);

    return dayIndices.map(dayIndex => ({
      dayIndex,
      startTime,
      endTime,
      duration: endTime - startTime
    }));
  };

  /**
   * Calculate position and height for a course block in the grid
   */
  const getCourseBlockStyle = (startTime, duration) => {
    const topPercent = ((startTime - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
    const heightPercent = (duration / (END_HOUR - START_HOUR)) * 100;

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
      minHeight: '40px' // Ensure readable text
    };
  };

  /**
   * Generate course blocks organized by day
   */
  const courseBlocks = useMemo(() => {
    const blocks = { 0: [], 1: [], 2: [], 3: [], 4: [] };

    courses.forEach((course, idx) => {
      const timeSlots = parseDayTime(course.dayTime);
      
      timeSlots.forEach(slot => {
        const ucore = course.ucore ? course.ucore.split(',').map(u => u.trim()) : [];
        const bgColor = ucore[0] ? getUCOREBadgeColor(ucore[0]) : 'bg-blue-500';

        blocks[slot.dayIndex].push({
          ...slot,
          course,
          id: `${course.uniqueId || idx}-${slot.dayIndex}`,
          color: bgColor
        });
      });
    });

    // Sort blocks by start time within each day
    Object.keys(blocks).forEach(day => {
      blocks[day].sort((a, b) => a.startTime - b.startTime);
    });

    return blocks;
  }, [courses]);

  /**
   * Format time for display (24hr to 12hr)
   */
  const formatTime = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="w-full h-full overflow-auto bg-gray-50 rounded-lg shadow-lg">
      {/* Calendar Grid */}
      <div className="flex min-w-[900px]">
        {/* Time labels column */}
        <div className="w-20 flex-shrink-0 border-r border-gray-300 bg-white">
          <div className="h-12 border-b border-gray-300 bg-gray-100 flex items-center justify-center font-semibold text-gray-700">
            Time
          </div>
          <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * 60}px` }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-xs text-gray-600 text-center"
                style={{ top: `${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
              >
                {formatTime(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex-1 border-r border-gray-300 last:border-r-0">
            {/* Day header */}
            <div className="h-12 border-b border-gray-300 bg-gray-100 flex items-center justify-center font-semibold text-gray-800">
              {day}
            </div>

            {/* Time grid with course blocks */}
            <div className="relative bg-white" style={{ height: `${(END_HOUR - START_HOUR) * 60}px` }}>
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-gray-200"
                  style={{ top: `${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
                />
              ))}

              {/* Course blocks */}
              {courseBlocks[dayIndex]?.map((block) => (
                <div
                  key={block.id}
                  className={`absolute left-0 right-0 mx-1 ${block.color} text-white rounded shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow border border-opacity-30 border-gray-700`}
                  style={getCourseBlockStyle(block.startTime, block.duration)}
                  title={`${block.course.coursePrefix} ${block.course.courseNumber}: ${block.course.longTitle || block.course.title}\n${block.course.dayTime}\nSeats: ${block.course.seatsAvailable || 0}/${block.course.capacity || 0}`}
                >
                  <div className="p-1 text-xs font-semibold leading-tight">
                    <div className="truncate">
                      {block.course.coursePrefix} {block.course.courseNumber}
                    </div>
                    {block.duration >= 1 && (
                      <div className="text-[10px] opacity-90 truncate">
                        {block.course.longTitle || block.course.title}
                      </div>
                    )}
                    {block.duration >= 1.5 && (
                      <div className="text-[10px] opacity-80">
                        {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      </div>
                    )}
                    {block.duration >= 2 && (
                      <div className="text-[10px] opacity-80">
                        Seats: {block.course.seatsAvailable || 0}/{block.course.capacity || 0}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-white border-t border-gray-300">
        <p className="text-sm text-gray-700 mb-2 font-semibold">Color Legend (UCORE Categories):</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'COMM', color: 'bg-blue-500' },
            { label: 'QUAN', color: 'bg-purple-500' },
            { label: 'WRTG', color: 'bg-green-500' },
            { label: 'ARTS', color: 'bg-pink-500' },
            { label: 'HUM', color: 'bg-orange-500' },
            { label: 'SSCI', color: 'bg-indigo-500' },
            { label: 'BSCI', color: 'bg-teal-500' },
            { label: 'PSCI', color: 'bg-cyan-500' },
            { label: 'DIVR', color: 'bg-yellow-600' },
            { label: 'CAPS', color: 'bg-red-500' },
            { label: 'Other', color: 'bg-gray-500' }
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-4 h-4 ${color} rounded`}></div>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">No courses to display</p>
            <p className="text-sm">Search for courses to see them on the calendar</p>
          </div>
        </div>
      )}
    </div>
  );
}
