// Course helper utilities

// Detect if a course name is an actual course (e.g., "CPTS 121") vs placeholder (e.g., "UCORE Inquiry")
export function isActualCourse(courseName) {
  if (!courseName || typeof courseName !== 'string') return false;
  
  // Match pattern: Letters + Numbers (e.g., "CPTS 121", "MATH 171")
  const coursePattern = /^[A-Z]{2,5}\s*\d{3}/i;
  return coursePattern.test(courseName.trim());
}

// Extract UCORE categories from course name or attributes
export function extractUCORECategories(course) {
  const categories = [];
  
  // Common UCORE abbreviations
  const ucorePatterns = [
    'WRTG', 'QUAN', 'BSCI', 'PSCI', 'HUM', 'ARTS',
    'CAPS', 'DIVR', 'ROOT', 'COMM'
  ];
  
  // Check course name for UCORE patterns in brackets
  if (course.name) {
    const bracketMatches = course.name.match(/\[([A-Z]{3,5})\]/g);
    if (bracketMatches) {
      bracketMatches.forEach(match => {
        const cat = match.replace(/[\[\]]/g, '');
        if (ucorePatterns.includes(cat) && !categories.includes(cat)) {
          categories.push(cat);
        }
      });
    }
  }
  
  // Check ucore attribute field
  if (course.ucore) {
    const attrs = typeof course.ucore === 'string' 
      ? course.ucore.split(',').map(s => s.trim())
      : course.ucore;
    
    attrs.forEach(attr => {
      const upper = attr.toUpperCase();
      if (ucorePatterns.includes(upper) && !categories.includes(upper)) {
        categories.push(upper);
      }
    });
  }
  
  return categories;
}

// Extract specific course codes from footnote text (e.g., "CPT S 321, 323, 422" or "MATH 315, 401, 420")
export function extractAllowedCoursesFromText(text) {
  if (!text) return [];

  const courses = [];
  const seen = new Set();

  // Parse patterns like: "CPT S 321, 323, 422" or "E E 234, 235" or "MATH 315, 401"
  // First pass: extract prefix + explicit numbers
  const numberListPattern = /([A-Z]{1,4}(?:\s+[A-Z]{1,4})?)\s+(\d{3}(?:(?:\s*,\s*|\s+and\s+|\s+or\s+)\d{3})*)/gi;
  let match;
  while ((match = numberListPattern.exec(text)) !== null) {
    const prefix = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
    const numbersStr = match[2];
    // Split by comma, 'and', 'or'
    const numbers = numbersStr.split(/\s*,\s*|\s+and\s+|\s+or\s+/i).map(n => n.trim()).filter(Boolean);
    for (const num of numbers) {
      if (/^\d{3}[A-Z]?$/i.test(num)) {
        const code = `${prefix} ${num.toUpperCase()}`;
        if (!seen.has(code)) {
          seen.add(code);
          courses.push({ prefix, number: num.toUpperCase(), code });
        }
      }
    }
  }

  // Second pass: look for level-range patterns like "300-400-level CPT S courses"
  const levelRangePattern = /(\d{3})-(\d{3})-level\s+([A-Z]{1,4}(?:\s+[A-Z]{1,4})?)/gi;
  while ((match = levelRangePattern.exec(text)) !== null) {
    const minLevel = parseInt(match[1], 10);
    const maxLevel = parseInt(match[2], 10);
    const prefix = match[3].replace(/\s+/g, ' ').trim().toUpperCase();
    // Store as a range indicator
    courses.push({
      prefix,
      levelRange: { min: minLevel, max: maxLevel },
      code: `${prefix} ${minLevel}-${maxLevel} level`
    });
  }

  return courses;
}

// Parse elective requirements from course footnotes/descriptions
export function parseElectiveRequirements(text) {
  if (!text) return [];

  const requirements = [];
  const lowerText = text.toLowerCase();

  // Detect UCORE electives
  const ucoreMatch = text.match(/UCORE\s*\[?([A-Z]{3,5})\]?\s*elective/i);
  if (ucoreMatch) {
    requirements.push({
      type: 'UCORE',
      category: ucoreMatch[1].toUpperCase(),
      description: `UCORE ${ucoreMatch[1].toUpperCase()} Elective: Choose a ${ucoreMatch[1].toUpperCase()}-designated course`
    });
  }

  // Detect CS/Computer Science electives with specific courses
  if (lowerText.includes('cs elective') || lowerText.includes('computer science elective') ||
      lowerText.includes('cpt s') || lowerText.includes('cpts')) {
    const allowedCourses = extractAllowedCoursesFromText(text);
    requirements.push({
      type: 'CS',
      description: 'CS Elective: Choose a Computer Science course (CPTS prefix)',
      allowedCourses: allowedCourses
    });
  }

  // Detect technical electives with specific courses
  if (lowerText.includes('technical elective')) {
    const allowedCourses = extractAllowedCoursesFromText(text);
    requirements.push({
      type: 'Technical',
      description: 'Technical Elective: Choose an approved technical course',
      allowedCourses: allowedCourses
    });
  }

  // Detect general electives
  if (lowerText.includes('general elective') || lowerText.includes('free elective')) {
    requirements.push({
      type: 'General',
      description: 'General Elective: Choose any course'
    });
  }

  // If no specific type detected but footnote has course codes, treat as course list
  if (requirements.length === 0) {
    const allowedCourses = extractAllowedCoursesFromText(text);
    if (allowedCourses.length > 0) {
      requirements.push({
        type: 'CourseList',
        description: 'Choose from the listed courses',
        allowedCourses: allowedCourses
      });
    }
  }

  return requirements;
}

// Parse course prefix and number from full name
export function parseCourseName(fullName) {
  if (!fullName) return { prefix: '', number: '' };
  
  const match = fullName.match(/^([A-Z]{2,5})\s*(\d{3})/i);
  if (match) {
    return {
      prefix: match[1].toUpperCase(),
      number: match[2]
    };
  }
  
  return { prefix: '', number: '' };
}

// Check if course is a placeholder (non-credit requirement)
export function isPlaceholder(courseName) {
  if (!courseName) return false;
  
  const lowerName = courseName.toLowerCase();
  const placeholderKeywords = [
    'elective', 'ucore', 'requirement', 'tbd', 'to be determined',
    'option', 'choose', 'select', 'any', 'general'
  ];
  
  return placeholderKeywords.some(keyword => lowerName.includes(keyword)) && 
         !isActualCourse(courseName);
}

// Format credits for display
export function formatCredits(credits) {
  if (!credits || credits === 0) return '—';
  return credits.toString();
}

// Get UCORE badge color
export function getUCOREBadgeColor(category) {
  const colors = {
    'WRTG': 'bg-blue-100 text-blue-800',
    'QUAN': 'bg-purple-100 text-purple-800',
    'BSCI': 'bg-green-100 text-green-800',
    'PSCI': 'bg-teal-100 text-teal-800',
    'HUM': 'bg-yellow-100 text-yellow-800',
    'ARTS': 'bg-pink-100 text-pink-800',
    'CAPS': 'bg-indigo-100 text-indigo-800',
    'DIVR': 'bg-orange-100 text-orange-800',
    'ROOT': 'bg-red-100 text-red-800',
    'COMM': 'bg-cyan-100 text-cyan-800'
  };
  
  return colors[category] || 'bg-gray-100 text-gray-800';
}

// Detect normalized elective kinds from requirement/footnote text
export function detectElectiveKinds(text) {
  const reqs = parseElectiveRequirements(text || '');
  // Normalize into compact objects: { type, category?, description, allowedCourses? }
  return reqs.map(r => {
    const normalized = { type: (r.type || 'General'), description: r.description || '' };
    if (r.type === 'UCORE' && r.category) normalized.category = r.category.toUpperCase();
    if (r.allowedCourses && r.allowedCourses.length > 0) normalized.allowedCourses = r.allowedCourses;
    return normalized;
  });
}

// Build a simple filter object for catalog searches given an elective requirement
// and the current plan's courses. The consumer (DegreePlanner) can turn this
// into query params for the catalog API. This removes courses already in the plan.
export function buildElectiveFilter(electiveRequirement, planCourses = []) {
  const excludeCodes = new Set();
  (planCourses || []).forEach(c => {
    if (c && typeof c.name === 'string') {
      const m = c.name.match(/^([A-Z]{2,5})\s*(\d{3})/i);
      if (m) excludeCodes.add(`${m[1].toUpperCase()} ${m[2]}`);
    }
  });

  if (!electiveRequirement) return { excludeCodes: Array.from(excludeCodes) };

  const type = (electiveRequirement.type || '').toUpperCase();

  // If there are specific allowed courses, use COURSELIST kind
  if (electiveRequirement.allowedCourses && electiveRequirement.allowedCourses.length > 0) {
    return {
      kind: 'COURSELIST',
      allowedCourses: electiveRequirement.allowedCourses,
      excludeCodes: Array.from(excludeCodes),
    };
  }

  if (type === 'UCORE') {
    return {
      kind: 'UCORE',
      ucoreCategory: electiveRequirement.category || null,
      excludeCodes: Array.from(excludeCodes),
    };
  }

  if (type === 'CS') {
    return {
      kind: 'PREFIX',
      prefixes: ['CPT S', 'CPTS'],
      excludeCodes: Array.from(excludeCodes),
    };
  }

  if (type === 'TECHNICAL' || type === 'TECH') {
    return {
      kind: 'TECHNICAL',
      // consumer can expand this to department-specific prefixes
      excludeCodes: Array.from(excludeCodes),
    };
  }

  if (type === 'COURSELIST') {
    return {
      kind: 'COURSELIST',
      allowedCourses: electiveRequirement.allowedCourses || [],
      excludeCodes: Array.from(excludeCodes),
    };
  }

  // General elective - allow any course but exclude what the student already has
  return { kind: 'GENERAL', excludeCodes: Array.from(excludeCodes) };
}

// Given an array of required UCORE categories (e.g., ['WRTG','PSCI']) and the
// student's current planned/completed courses, return which categories are
// satisfied and which remain. Also provide a map of category -> courses that
// satisfy it.
export function computeUcoreSatisfaction(requiredUcores = [], planCourses = []) {
  const required = (requiredUcores || []).map(r => r.toUpperCase());
  const satisfiedMap = {};
  required.forEach(r => (satisfiedMap[r] = []));

  (planCourses || []).forEach(course => {
    const cats = extractUCORECategories(course || {});
    cats.forEach(cat => {
      if (required.includes(cat)) {
        satisfiedMap[cat].push(course);
      }
    });
  });

  const satisfied = Object.keys(satisfiedMap).filter(k => satisfiedMap[k].length > 0);
  const remaining = required.filter(r => !satisfied.includes(r));

  return { required, satisfied, remaining, satisfiedMap };
}

export default {
  isActualCourse,
  extractUCORECategories,
  extractAllowedCoursesFromText,
  parseElectiveRequirements,
  parseCourseName,
  isPlaceholder,
  formatCredits,
  getUCOREBadgeColor,
  detectElectiveKinds,
  buildElectiveFilter,
  computeUcoreSatisfaction,
};
