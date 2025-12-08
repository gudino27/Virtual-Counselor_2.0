import React, { useState } from 'react';

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

function GPACalculator() {
  const [courses, setCourses] = useState([
    { id: 1, name: '', credits: 3, grade: 'A' },
    { id: 2, name: '', credits: 3, grade: 'A' },
    { id: 3, name: '', credits: 3, grade: 'A' },
  ]);

  const [currentGPA, setCurrentGPA] = useState('');
  const [currentCredits, setCurrentCredits] = useState('');

  const addCourse = () => {
    setCourses([
      ...courses,
      { id: Date.now(), name: '', credits: 3, grade: 'A' }
    ]);
  };

  const removeCourse = (id) => {
    if (courses.length > 1) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const updateCourse = (id, field, value) => {
    setCourses(courses.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Calculate semester GPA
  const calculateSemesterGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach(course => {
      const credits = parseFloat(course.credits) || 0;
      const gradePoint = GRADE_POINTS[course.grade] || 0;
      totalPoints += credits * gradePoint;
      totalCredits += credits;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  // Calculate cumulative GPA
  const calculateCumulativeGPA = () => {
    const existingCredits = parseFloat(currentCredits) || 0;
    const existingGPA = parseFloat(currentGPA) || 0;
    const existingPoints = existingCredits * existingGPA;

    let newPoints = 0;
    let newCredits = 0;

    courses.forEach(course => {
      const credits = parseFloat(course.credits) || 0;
      const gradePoint = GRADE_POINTS[course.grade] || 0;
      newPoints += credits * gradePoint;
      newCredits += credits;
    });

    const totalCredits = existingCredits + newCredits;
    const totalPoints = existingPoints + newPoints;

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  const semesterGPA = calculateSemesterGPA();
  const cumulativeGPA = calculateCumulativeGPA();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">GPA Calculator</h2>
        <p className="text-gray-600">Calculate your semester and cumulative GPA</p>
      </div>

      {/* Current GPA Input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Academic Standing</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter your current GPA and total credits to calculate your cumulative GPA after this semester.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current GPA</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4"
              value={currentGPA}
              onChange={(e) => setCurrentGPA(e.target.value)}
              placeholder="e.g., 3.50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits Earned</label>
            <input
              type="number"
              min="0"
              value={currentCredits}
              onChange={(e) => setCurrentCredits(e.target.value)}
              placeholder="e.g., 60"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Course Entry */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">This Semester's Courses</h3>

        <div className="space-y-4">
          {courses.map((course, index) => (
            <div key={course.id} className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course {index + 1}
                </label>
                <input
                  type="text"
                  value={course.name}
                  onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                  placeholder="Course name (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
                />
              </div>

              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                <select
                  aria-label="Credits"
                  value={course.credits}
                  onChange={(e) => updateCourse(course.id, 'credits', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <select
                  aria-label="Grade"
                  value={course.grade}
                  onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
                >
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => removeCourse(course.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remove course"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addCourse}
          className="mt-4 px-4 py-2 text-wsu-crimson border border-dashed border-wsu-crimson rounded-lg hover:bg-wsu-crimson/5 transition-colors"
        >
          + Add Course
        </button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-wsu-crimson to-wsu-crimson/80 text-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-medium text-white/80 mb-2">Semester GPA</h3>
          <div className="text-5xl font-bold">{semesterGPA}</div>
          <p className="text-sm text-white/60 mt-2">
            Based on {courses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0)} credits
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-700 text-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-medium text-white/80 mb-2">Projected Cumulative GPA</h3>
          <div className="text-5xl font-bold">{cumulativeGPA}</div>
          <p className="text-sm text-white/60 mt-2">
            {currentCredits ? `After ${parseFloat(currentCredits) + courses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0)} total credits` : 'Enter current credits for cumulative'}
          </p>
        </div>
      </div>

      {/* Grade Scale Reference */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">WSU Grade Scale</h3>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-sm">
          {Object.entries(GRADE_POINTS).map(([grade, points]) => (
            <div key={grade} className="flex justify-between bg-gray-50 px-3 py-2 rounded">
              <span className="font-medium">{grade}</span>
              <span className="text-gray-600">{points.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GPACalculator;
