import React, { useState } from 'react';

export default function ClassGradeCalculator({ courseName, onClose }) {
  const [categories, setCategories] = useState([
    { name: 'Homework', weight: 20, earnedPoints: 0, totalPoints: 0 },
    { name: 'Midterm', weight: 30, earnedPoints: 0, totalPoints: 0 },
    { name: 'Final', weight: 40, earnedPoints: 0, totalPoints: 0 },
    { name: 'Participation', weight: 10, earnedPoints: 0, totalPoints: 0 },
  ]);
  
  const [targetGrade, setTargetGrade] = useState('A');
  const [selectedCategoryForCalc, setSelectedCategoryForCalc] = useState(0);

  const handleCategoryChange = (index, field, value) => {
    const newCategories = [...categories];
    // Handle text field (name) differently from numeric fields
    if (field === 'name') {
      newCategories[index] = { ...newCategories[index], [field]: value };
    } else {
      // Allow empty string, otherwise parse as number
      newCategories[index] = { ...newCategories[index], [field]: value === '' ? '' : parseFloat(value) || 0 };
    }
    setCategories(newCategories);
  };

  const addCategory = () => {
    setCategories([...categories, { name: `Category ${categories.length + 1}`, weight: 0, earnedPoints: 0, totalPoints: 0 }]);
  };

  const removeCategory = (index) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  // Calculate current grade
  const calculateCurrentGrade = () => {
    let totalWeightedScore = 0;
    let totalWeightUsed = 0;

    categories.forEach(cat => {
      if (cat.totalPoints > 0) {
        const percentage = (cat.earnedPoints / cat.totalPoints) * 100;
        totalWeightedScore += (percentage * cat.weight) / 100;
        totalWeightUsed += cat.weight;
      }
    });

    if (totalWeightUsed === 0) return null;
    return totalWeightedScore;
  };

  // Calculate what grade is needed on remaining work
  const calculateNeededGrade = () => {
    const targetPercentages = {
      'A': 93, 'A-': 90,
      'B+': 87, 'B': 83, 'B-': 80,
      'C+': 77, 'C': 73, 'C-': 70,
      'D+': 67, 'D': 63, 'D-': 60,
      'F': 0
    };

    const targetPercentage = targetPercentages[targetGrade] || 93;
    
    let currentWeightedScore = 0;
    let remainingWeight = 0;

    categories.forEach((cat, idx) => {
      if (cat.totalPoints > 0) {
        const percentage = (cat.earnedPoints / cat.totalPoints) * 100;
        currentWeightedScore += (percentage * cat.weight) / 100;
      } else if (idx !== selectedCategoryForCalc) {
        // Count categories with no points yet as remaining (except the selected one)
        remainingWeight += cat.weight;
      }
    });

    const selectedCategory = categories[selectedCategoryForCalc];
    const selectedWeight = selectedCategory.weight;
    
    // If this category already has points, we can't calculate needed grade
    if (selectedCategory.totalPoints > 0) {
      return { error: 'Selected category already has grades entered' };
    }

    // Calculate needed percentage on selected category
    const neededWeightedPoints = targetPercentage - currentWeightedScore;
    const neededPercentage = (neededWeightedPoints / selectedWeight) * 100;

    return {
      neededPercentage: Math.round(neededPercentage * 100) / 100,
      currentGrade: Math.round(currentWeightedScore * 100) / 100,
      remainingWeight: selectedWeight + remainingWeight
    };
  };

  const currentGrade = calculateCurrentGrade();
  const neededCalc = calculateNeededGrade();
  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);

  const getLetterGrade = (percentage) => {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-wsu-crimson">Class Grade Calculator</h2>
            {courseName && <p className="text-gray-600 text-sm mt-1">{courseName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Grade Display */}
          <div className="card bg-gradient-to-r from-wsu-crimson to-red-700 text-white">
            <div className="text-center">
              <div className="text-sm opacity-90 mb-1">Current Grade</div>
              <div className="text-4xl font-bold">
                {currentGrade !== null ? `${currentGrade.toFixed(1)}%` : '—'}
              </div>
              {currentGrade !== null && (
                <div className="text-sm opacity-90 mt-1">
                  Letter Grade: {getLetterGrade(currentGrade)}
                </div>
              )}
            </div>
          </div>

          {/* Weight Warning */}
          {totalWeight !== 100 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              ⚠️ Total weight is {totalWeight}% (should be 100%)
            </div>
          )}

          {/* Categories */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">Grade Categories</h3>
              <button onClick={addCategory} className="btn-outline text-sm py-1">
                + Add Category
              </button>
            </div>

            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={index} className="card bg-gray-50">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Name */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category Name</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                        className="input-field text-sm"
                        placeholder="e.g., Homework"
                      />
                    </div>

                    {/* Weight */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={category.weight}
                          onChange={(e) => handleCategoryChange(index, 'weight', e.target.value)}
                          className="input-field text-sm text-center"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                    </div>

                    {/* Earned Points */}
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Earned Points</label>
                      <input
                        type="number"
                        value={category.earnedPoints}
                        onChange={(e) => handleCategoryChange(index, 'earnedPoints', e.target.value)}
                        className="input-field text-sm"
                        placeholder="0"
                        min="0"
                        step="0.5"
                      />
                    </div>

                    {/* Total Points */}
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total Points</label>
                      <input
                        type="number"
                        value={category.totalPoints}
                        onChange={(e) => handleCategoryChange(index, 'totalPoints', e.target.value)}
                        className="input-field text-sm"
                        placeholder="0"
                        min="0"
                        step="0.5"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-12 md:col-span-1 flex justify-center">
                      <button
                        onClick={() => removeCategory(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        disabled={categories.length === 1}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Score Display */}
                    {category.totalPoints > 0 && (
                      <div className="col-span-12 text-sm text-gray-600 text-right">
                        Score: {((category.earnedPoints / category.totalPoints) * 100).toFixed(1)}%
                        {' '}(contributes {((category.earnedPoints / category.totalPoints) * category.weight).toFixed(1)}% to final grade)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What Grade Do I Need? */}
          <div className="card bg-blue-50">
            <h3 className="font-bold text-lg mb-3">What grade do I need?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Target Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Grade
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="input-field"
                >
                  <option value="A">A (93%)</option>
                  <option value="A-">A- (90%)</option>
                  <option value="B+">B+ (87%)</option>
                  <option value="B">B (83%)</option>
                  <option value="B-">B- (80%)</option>
                  <option value="C+">C+ (77%)</option>
                  <option value="C">C (73%)</option>
                  <option value="C-">C- (70%)</option>
                  <option value="D">D (63%)</option>
                </select>
              </div>

              {/* Category to Calculate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calculate needed grade for
                </label>
                <select
                  value={selectedCategoryForCalc}
                  onChange={(e) => setSelectedCategoryForCalc(parseInt(e.target.value))}
                  className="input-field"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={idx}>
                      {cat.name} ({cat.weight}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results */}
            {neededCalc.error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {neededCalc.error}
              </div>
            ) : (
              <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">
                    To get a <span className="font-bold text-blue-600">{targetGrade}</span>, you need to score:
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {neededCalc.neededPercentage >= 0 
                      ? `${neededCalc.neededPercentage}%` 
                      : 'Already achieved! 🎉'}
                  </div>
                  <div className="text-sm text-gray-600">
                    on {categories[selectedCategoryForCalc].name}
                  </div>
                  {neededCalc.neededPercentage > 100 && (
                    <div className="mt-3 text-sm text-red-600">
                      ⚠️ This target may not be achievable with current grades
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter your assignment categories and their weights (must total 100%)</li>
              <li>For completed assignments, enter earned points and total points</li>
              <li>To see what you need on an upcoming assignment, select your target grade and the assignment category</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
