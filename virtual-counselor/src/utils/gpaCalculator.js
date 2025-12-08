// GPA and credit calculation utilities

// WSU GPA Scale
const GPA_SCALE = {
  'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

// Convert letter grade to GPA points
export function gradeToGPA(grade) {
  return GPA_SCALE[grade] || 0;
}

// Calculate total GPA from courses
export function calculateGPA(courses) {
  if (!courses || courses.length === 0) return 0;

  const gradedCourses = courses.filter(course => {
    const isCompleted = course.status === 'completed' || 
                       (course.status === undefined && course.grade);
    return isCompleted && course.grade && course.credits > 0;
  });

  if (gradedCourses.length === 0) return 0;

  const totalPoints = gradedCourses.reduce((sum, course) => {
    const gpa = gradeToGPA(course.grade);
    return sum + (gpa * course.credits);
  }, 0);

  const totalCredits = gradedCourses.reduce((sum, course) => {
    return sum + course.credits;
  }, 0);

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// Calculate credits achieved (completed courses only)
export function calculateCreditsAchieved(courses) {
  if (!courses || courses.length === 0) return 0;

  return courses.reduce((total, course) => {
    const isCompleted = course.status === 'completed' || 
                       (course.status === undefined && course.grade);
    if (isCompleted && course.credits > 0) {
      return total + course.credits;
    }
    return total;
  }, 0);
}

// Calculate credits in progress or planned
export function calculateCreditsPlanned(courses) {
  if (!courses || courses.length === 0) return 0;

  return courses.reduce((total, course) => {
    if ((course.status === 'in-progress' || course.status === 'planned') && course.credits > 0) {
      return total + course.credits;
    }
    return total;
  }, 0);
}

// Calculate total required credits based on degree plan
export function calculateTotalRequiredCredits(degreePlan) {
  let total = 120; // Base for primary major

  // Additional majors add 40 credits
  if (degreePlan.additionalMajors && degreePlan.additionalMajors.length > 0) {
    total += degreePlan.additionalMajors.length * 40;
  }

  // Minors add 20 credits
  if (degreePlan.minors && degreePlan.minors.length > 0) {
    total += degreePlan.minors.length * 20;
  }

  // Certificates add 15 credits
  if (degreePlan.certificates && degreePlan.certificates.length > 0) {
    total += degreePlan.certificates.length * 15;
  }

  return total;
}

// Analyze course overlaps for multi-major students
export function analyzeCourseOverlaps(courses) {
  const ucoreCourses = [];
  const majorElectives = [];
  const potentialCrossListed = [];

  courses.forEach(course => {
    // Check for UCORE courses
    if (course.ucore && course.ucore.length > 0) {
      ucoreCourses.push(course);
    }

    // Check for electives (courses with "elective" in name)
    if (course.name && course.name.toLowerCase().includes('elective')) {
      majorElectives.push(course);
    }

    // Check for courses with "or" (cross-listed or choice)
    if (course.name && course.name.includes(' or ')) {
      potentialCrossListed.push(course);
    }
  });

  return {
    ucoreCourses,
    majorElectives,
    potentialCrossListed
  };
}

// Get summary of overlaps for display
export function getOverlapSummary(degreePlan, courses) {
  const overlaps = analyzeCourseOverlaps(courses);
  
  if (!degreePlan.additionalMajors || degreePlan.additionalMajors.length === 0) {
    return null;
  }

  let summary = '';
  
  if (overlaps.ucoreCourses.length > 0) {
    summary += `You have ${overlaps.ucoreCourses.length} UCORE courses that can count toward both general education and major requirements. `;
  }

  if (overlaps.majorElectives.length > 0) {
    summary += `Consider using electives to double-count for multiple majors. `;
  }

  if (overlaps.potentialCrossListed.length > 0) {
    summary += `Review courses with multiple options to ensure they satisfy requirements for all your programs.`;
  }

  return summary || 'Plan strategically to maximize course overlaps between your programs.';
}

// Calculate credits in progress

// Calculate total credits (all courses)
export function calculateTotalCredits(courses) {
  if (!courses || courses.length === 0) return 0;

  return courses.reduce((total, course) => {
    if (course.credits > 0) {
      return total + course.credits;
    }
    return total;
  }, 0);
}

// Calculate remaining credits to graduate
export function calculateRemainingCredits(courses, requiredCredits = 120) {
  const achieved = calculateCreditsAchieved(courses);
  const remaining = Math.max(0, requiredCredits - achieved);
  return remaining;
}

// Get grade letter from percentage
export function percentageToGrade(percentage) {
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
}

// Get percentage from grade letter
export function gradeToPercentage(grade) {
  const percentageMap = {
    'A': 96.5, 'A-': 91.5,
    'B+': 88, 'B': 84.5, 'B-': 81.5,
    'C+': 78, 'C': 74.5, 'C-': 71.5,
    'D+': 68, 'D': 64.5, 'D-': 61.5,
    'F': 50
  };
  return percentageMap[grade] || 0;
}

export default {
  gradeToGPA,
  calculateGPA,
  calculateCreditsAchieved,
  calculateCreditsPlanned,
  calculateTotalCredits,
  calculateRemainingCredits,
  calculateTotalRequiredCredits,
  analyzeCourseOverlaps,
  getOverlapSummary,
  percentageToGrade,
  gradeToPercentage,
};
