import React, { useState } from 'react';

/**
 * InlineGradeCalculator - Compact grade calculator shown next to each course
 * Shows current grade and "what grade do I need?" calculation inline
 */
export default function InlineGradeCalculator({ course, onGradeChange }) {
  const [expanded, setExpanded] = useState(false);
  const [targetGrade, setTargetGrade] = useState('B');
  const [earnedPoints, setEarnedPoints] = useState('');
  const [totalPoints, setTotalPoints] = useState('');

  const GRADE_POINTS = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'F': 0.0
  };

  const GRADE_THRESHOLDS = {
    'A': 93, 'A-': 90,
    'B+': 87, 'B': 83, 'B-': 80,
    'C+': 77, 'C': 73, 'C-': 70,
    'D+': 67, 'D': 60,
    'F': 0
  };

  /**
   * Calculate current grade percentage
   */
  const currentPercentage = () => {
    const earned = parseFloat(earnedPoints);
    const total = parseFloat(totalPoints);
    if (isNaN(earned) || isNaN(total) || total === 0) return null;
    return (earned / total) * 100;
  };

  /**
   * Calculate points needed for target grade
   */
  const calculateNeededGrade = () => {
    const current = currentPercentage();
    if (current === null) return null;

    const threshold = GRADE_THRESHOLDS[targetGrade];
    if (!threshold) return null;

    // Simple projection: what's needed on remaining work
    const earned = parseFloat(earnedPoints);
    const total = parseFloat(totalPoints);
    const remaining = 100 - total; // Assuming total is percentage completed

    if (remaining <= 0) {
      return current >= threshold ? '✓ Already achieved!' : '✗ Not achievable';
    }

    const neededTotal = threshold;
    const neededOnRemaining = ((neededTotal * (total + remaining)) - (earned * 100)) / remaining;

    if (neededOnRemaining > 100) {
      return `Not achievable (need ${neededOnRemaining.toFixed(1)}% on remaining work)`;
    }
    if (neededOnRemaining < 0) {
      return '✓ Already achieved!';
    }

    return `Need ${neededOnRemaining.toFixed(1)}% on remaining ${remaining.toFixed(0)}%`;
  };

  const currentGradeLetter = () => {
    const pct = currentPercentage();
    if (pct === null) return 'N/A';

    for (const [grade, threshold] of Object.entries(GRADE_THRESHOLDS)) {
      if (pct >= threshold) return grade;
    }
    return 'F';
  };

  return (
    <div className="inline-block ml-2">
      {/* Compact Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          expanded
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Grade Calculator"
      >
        🧮
      </button>

      {/* Expanded Inline Calculator */}
      {expanded && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-72">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Grade Calculator</h4>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Current Grade Display */}
          <div className="mb-3 p-2 bg-gray-50 rounded text-center">
            <div className="text-xs text-gray-600">Current Grade</div>
            <div className="text-2xl font-bold text-gray-900">
              {currentGradeLetter()}
            </div>
            {currentPercentage() !== null && (
              <div className="text-xs text-gray-500">
                {currentPercentage().toFixed(2)}%
              </div>
            )}
          </div>

          {/* Points Input */}
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Points Earned</label>
                <input
                  type="number"
                  value={earnedPoints}
                  onChange={(e) => setEarnedPoints(e.target.value)}
                  placeholder="e.g., 450"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Total Points</label>
                <input
                  type="number"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(e.target.value)}
                  placeholder="e.g., 500"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Target Grade Selector */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">Target Grade</label>
            <select
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              {Object.keys(GRADE_THRESHOLDS).map(grade => (
                <option key={grade} value={grade}>{grade} ({GRADE_THRESHOLDS[grade]}%+)</option>
              ))}
            </select>
          </div>

          {/* Calculation Result */}
          {earnedPoints && totalPoints && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="font-semibold text-blue-900 mb-1">
                To get {targetGrade}:
              </div>
              <div className="text-blue-700">
                {calculateNeededGrade()}
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div className="mt-2 text-xs text-gray-500 italic">
            💡 Enter points earned so far and total points possible to calculate
          </div>
        </div>
      )}
    </div>
  );
}
