// This is the complete DegreePlanner - will replace DegreePlanner.jsx
// Includes: Grade calculator, retakes, UCORE detection, Excel import/export, multi-major support

import React, { useState, useEffect, useCallback } from 'react';
import { clearAllData } from '../utils/storage';
import ClassGradeCalculator from './ClassGradeCalculator';
import InlineGradeCalculator from './InlineGradeCalculator';
import { isActualCourse, extractUCORECategories } from '../utils/courseHelpers';
import {
  calculateGPA,
  calculateCreditsAchieved,
  calculateCreditsPlanned,
  calculateTotalRequiredCredits,
  analyzeCourseOverlaps,
  getOverlapSummary
} from '../utils/gpaCalculator';
import { exportDegreePlanToExcel } from '../utils/excelExport';
import ExcelJS from 'exceljs';

const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

export default function DegreePlanner() {
  // Degree selection state
  const [catalogYear, setCatalogYear] = useState('2024');
  const [availableYears, setAvailableYears] = useState([]);
  const [degreeSearch, setDegreeSearch] = useState('');
  const [degrees, setDegrees] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState(null);
  const [degreeRequirements, setDegreeRequirements] = useState(null);
  const [loading, setLoading] = useState(false);

  // Additional programs state
  const [additionalMajors, setAdditionalMajors] = useState([]);
  const [minors, setMinors] = useState([]);
  const [certificates, setCertificates] = useState([]);

  // Years and semesters state
  const [years, setYears] = useState([
    { id: 1, name: '2024-2025' },
    { id: 2, name: '2025-2026' },
    { id: 3, name: '2026-2027' },
    { id: 4, name: '2027-2028' },
    { id: 5, name: '2028-2029' },
  ]);
  const [activeYear, setActiveYear] = useState(1);

  // Courses state - organized by year and semester
  const [courses, setCourses] = useState({});

  // Course info and modals state
  const [courseInfo, setCourseInfo] = useState({});
  const [showGradeCalculator, setShowGradeCalculator] = useState(false);
  const [selectedCourseForCalc, setSelectedCourseForCalc] = useState(null);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeCourse, setRetakeCourse] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Initialize courses structure
  useEffect(() => {
    const savedData = localStorage.getItem('wsu_vc_degree_plan');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.courses) setCourses(parsed.courses);
        if (parsed.selectedDegree) setSelectedDegree(parsed.selectedDegree);
        if (parsed.years) setYears(parsed.years);
        if (parsed.additionalMajors) setAdditionalMajors(parsed.additionalMajors);
        if (parsed.minors) setMinors(parsed.minors);
        if (parsed.certificates) setCertificates(parsed.certificates);
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    } else {
      // Initialize empty structure
      const initial = {};
      years.forEach(year => {
        ['Fall', 'Spring', 'Summer'].forEach(semester => {
          const key = `${year.id}-${semester}`;
          initial[key] = [];
        });
      });
      setCourses(initial);
    }
  }, []);

  const createInitialCoursesStructure = (yearsArr) => {
    const initial = {};
    yearsArr.forEach(year => {
      ['Fall', 'Spring', 'Summer'].forEach(semester => {
        const key = `${year.id}-${semester}`;
        initial[key] = [];
      });
    });
    return initial;
  };

  // Save to localStorage whenever courses change
  useEffect(() => {
    const data = {
      courses,
      selectedDegree,
      years,
      additionalMajors,
      minors,
      certificates,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('wsu_vc_degree_plan', JSON.stringify(data));
  }, [courses, selectedDegree, years, additionalMajors, minors, certificates]);

  // Fetch available catalog years
  useEffect(() => {
    fetch('/api/degrees/years')
      .then(res => res.json())
      .then(data => {
        if (data.years) setAvailableYears(data.years);
      })
      .catch(err => console.error('Error fetching years:', err));
  }, []);

  // Search for degrees
  useEffect(() => {
    if (degreeSearch.length < 2) {
      setDegrees([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/degrees?year=${catalogYear}&search=${encodeURIComponent(degreeSearch)}`)
        .then(res => res.json())
        .then(data => {
          setDegrees(data.degrees || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error searching degrees:', err);
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [degreeSearch, catalogYear]);

  // Fetch degree requirements when degree selected
  useEffect(() => {
    if (!selectedDegree) return;

    fetch(`/api/degree-requirements?id=${selectedDegree.id}&year=${catalogYear}`)
      .then(res => res.json())
      .then(data => {
        setDegreeRequirements(data);
        if (data.courses) {
          populateCoursesFromRequirements(data.courses);
        }
      })
      .catch(err => console.error('Error fetching requirements:', err));
  }, [selectedDegree, catalogYear]);

  const removeProgram = (type, id) => {
    // type: 'major' | 'minor' | 'certificate'
    if (type === 'major') {
      setAdditionalMajors(prev => prev.filter(p => p.id !== id));
      return;
    }
    if (type === 'minor') {
      setMinors(prev => prev.filter(p => p.id !== id));
      return;
    }
    if (type === 'certificate') {
      setCertificates(prev => prev.filter(p => p.id !== id));
      return;
    }
  };

  const handleResetAll = () => {
    // Confirm destructive action
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Reset degree planner and remove all saved selections? This will clear local storage.')) return;

    // Clear storage and reset states
    try {
      clearAllData();
    } catch (e) {
      console.warn('clearAllData failed', e);
    }

    setSelectedDegree(null);
    setAdditionalMajors([]);
    setMinors([]);
    setCertificates([]);
    const defaultYears = [
      { id: 1, name: '2024-2025' },
      { id: 2, name: '2025-2026' },
      { id: 3, name: '2026-2027' },
      { id: 4, name: '2027-2028' },
      { id: 5, name: '2028-2029' },
    ];
    setYears(defaultYears);
    setCourses(createInitialCoursesStructure(defaultYears));
  };

  const populateCoursesFromRequirements = (reqCourses) => {
    // Auto-populate first year with required courses
    const newCourses = { ...courses };
    let yearIndex = 1;
    let semesterIndex = 0;
    const semesters = ['Fall', 'Spring', 'Summer'];

    reqCourses.forEach((course, idx) => {
      if (idx > 0 && idx % 5 === 0) {
        semesterIndex++;
        if (semesterIndex >= 3) {
          semesterIndex = 0;
          yearIndex++;
        }
      }

      if (yearIndex <= years.length) {
        const key = `${yearIndex}-${semesters[semesterIndex]}`;
        if (!newCourses[key]) newCourses[key] = [];

        newCourses[key].push({
          id: `${Date.now()}-${idx}`,
          name: course.name || '',
          credits: course.credits || 3,
          status: 'not-taken',
          grade: '',
          isRequired: true,
          ucore: course.ucore || [],
          note: course.note || ''
        });
      }
    });

    setCourses(newCourses);
  };

  const addCourse = (yearId, semester) => {
    const key = `${yearId}-${semester}`;
    setCourses(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), {
        id: `${Date.now()}-${Math.random()}`,
        name: '',
        credits: 3,
        status: 'not-taken',
        grade: '',
        isRequired: false
      }]
    }));
  };

  const removeCourse = (yearId, semester, courseId) => {
    const key = `${yearId}-${semester}`;
    setCourses(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(c => c.id !== courseId)
    }));
  };

  const handleCourseChange = (yearId, semester, courseId, field, value) => {
    const key = `${yearId}-${semester}`;
    setCourses(prev => {
      const updated = (prev[key] || []).map(course => {
        if (course.id !== courseId) return course;

        const updatedCourse = { ...course, [field]: value };

        // Auto-detect UCORE from course name
        if (field === 'name' && value) {
          const ucore = extractUCORECategories({ name: value });
          if (ucore.length > 0) {
            updatedCourse.ucore = ucore;
          }

          // Fetch course info from database
          const match = value.match(/^([A-Z]+)\s*(\d+)/i);
          if (match) {
            const prefix = match[1].toUpperCase();
            const number = match[2];
            fetchCourseInfo(prefix, number);
          }
        }

        // Handle F grade - auto-reschedule
        if (field === 'grade' && value === 'F' && course.status !== 'failed') {
          updatedCourse.status = 'failed';

          // Find next available semester with <18 credits
          const nextSemester = findNextAvailableSemester(yearId, semester);
          if (nextSemester) {
            setTimeout(() => {
              addRetakeCourse(nextSemester.yearId, nextSemester.semester, course);
            }, 100);
          }
        }

        // Handle status change to completed
        if (field === 'status' && value === 'completed' && !updatedCourse.grade) {
          updatedCourse.grade = 'A'; // Default grade
        }

        // Clear grade if status is not-taken or planned
        if (field === 'status' && (value === 'not-taken' || value === 'planned')) {
          updatedCourse.grade = '';
        }

        return updatedCourse;
      });

      return { ...prev, [key]: updated };
    });
  };

  const findNextAvailableSemester = (currentYearId, currentSemester) => {
    const semesterOrder = ['Fall', 'Spring', 'Summer'];
    const currentSemIndex = semesterOrder.indexOf(currentSemester);

    // Start from next semester
    for (let y = currentYearId; y <= years.length; y++) {
      const startSem = y === currentYearId ? currentSemIndex + 1 : 0;

      for (let s = startSem; s < semesterOrder.length; s++) {
        const key = `${y}-${semesterOrder[s]}`;
        const semCourses = courses[key] || [];
        const totalCredits = semCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);

        if (totalCredits < 18) {
          return { yearId: y, semester: semesterOrder[s] };
        }
      }
    }

    return null;
  };

  const addRetakeCourse = (yearId, semester, originalCourse) => {
    const key = `${yearId}-${semester}`;
    setCourses(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), {
        id: `${Date.now()}-retake`,
        name: originalCourse.name,
        credits: originalCourse.credits,
        status: 'planned',
        grade: '',
        isRetake: true,
        originalId: originalCourse.id
      }]
    }));
  };

  const handleRetakeCourse = (course) => {
    setRetakeCourse(course);
    setShowRetakeModal(true);
  };

  const handleConfirmRetake = (yearId, semester) => {
    if (!retakeCourse) return;

    addRetakeCourse(yearId, semester, retakeCourse);
    setShowRetakeModal(false);
    setRetakeCourse(null);
  };

  const fetchCourseInfo = async (prefix, number) => {
    try {
      const res = await fetch(`/api/courses?prefix=${prefix}&courseNumber=${number}&limit=1`);
      const data = await res.json();
      if (data.courses && data.courses.length > 0) {
        const course = data.courses[0];
        const key = `${prefix}${number}`;
        setCourseInfo(prev => ({
          ...prev,
          [key]: {
            title: course.title,
            description: course.description,
            credits: course.credits,
            ucore: course.ucore
          }
        }));
      }
    } catch (err) {
      console.error('Error fetching course info:', err);
    }
  };

  const handleOpenGradeCalculator = (courseName) => {
    setSelectedCourseForCalc(courseName);
    setShowGradeCalculator(true);
  };

  // Excel Export
  const handleExportExcel = async () => {
    const allCourses = [];

    years.forEach(year => {
      ['Fall', 'Spring', 'Summer'].forEach(semester => {
        const key = `${year.id}-${semester}`;
        const semCourses = courses[key] || [];

        semCourses.forEach(course => {
          allCourses.push({
            year: year.name,
            term: semester,
            name: course.name,
            credits: course.credits,
            status: course.status,
            grade: course.grade,
            isRequired: course.isRequired ? 'Yes' : 'No',
            isRetake: course.isRetake ? 'Yes' : 'No'
          });
        });
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Degree Plan');

    // Style header
    worksheet.columns = [
      { header: 'Year', key: 'year', width: 15 },
      { header: 'Semester', key: 'term', width: 10 },
      { header: 'Course', key: 'name', width: 20 },
      { header: 'Credits', key: 'credits', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Grade', key: 'grade', width: 8 },
      { header: 'Required', key: 'isRequired', width: 10 },
      { header: 'Retake', key: 'isRetake', width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF981E32' }
    };

    allCourses.forEach(course => {
      worksheet.addRow(course);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Degree_Plan_${selectedDegree?.name || 'Custom'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
  };

  // Excel Import
  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Degree Plan');
    const imported = {};

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

      const yearName = row.getCell(1).value;
      const semester = row.getCell(2).value;
      const name = row.getCell(3).value;
      const credits = row.getCell(4).value;
      const status = row.getCell(5).value || 'not-taken';
      const grade = row.getCell(6).value || '';
      const isRequired = row.getCell(7).value === 'Yes';
      const isRetake = row.getCell(8).value === 'Yes';

      // Find matching year
      const year = years.find(y => y.name === yearName);
      if (year && semester) {
        const key = `${year.id}-${semester}`;
        if (!imported[key]) imported[key] = [];

        imported[key].push({
          id: `${Date.now()}-${rowIndex}`,
          name: name || '',
          credits: parseInt(credits) || 3,
          status: status,
          grade: grade,
          isRequired,
          isRetake
        });
      }
    });

    setCourses(imported);
    setShowImportModal(false);
  };

  // Download blank template
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Degree Plan');

    worksheet.columns = [
      { header: 'Year', key: 'year', width: 15 },
      { header: 'Semester', key: 'term', width: 10 },
      { header: 'Course', key: 'name', width: 20 },
      { header: 'Credits', key: 'credits', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Grade', key: 'grade', width: 8 },
      { header: 'Required', key: 'isRequired', width: 10 },
      { header: 'Retake', key: 'isRetake', width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF981E32' }
    };

    // Add 5 years of blank rows
    years.slice(0, 5).forEach(year => {
      ['Fall', 'Spring', 'Summer'].forEach(semester => {
        for (let i = 0; i < 6; i++) {
          worksheet.addRow({
            year: year.name,
            term: semester,
            name: '',
            credits: 3,
            status: 'not-taken',
            grade: '',
            isRequired: 'No',
            isRetake: 'No'
          });
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Degree_Plan_Template.xlsx';
    a.click();
  };

  // Calculate statistics
  const allCoursesList = Object.values(courses).flat();
  const completedCourses = allCoursesList.filter(c => c.status === 'completed');
  const totalGPA = calculateGPA(completedCourses);
  const creditsEarned = calculateCreditsAchieved(allCoursesList);
  const creditsPlanned = calculateCreditsPlanned(allCoursesList);

  const degreePlan = {
    primaryMajor: selectedDegree,
    additionalMajors,
    minors,
    certificates
  };
  const requiredCredits = calculateTotalRequiredCredits(degreePlan);

  const overlaps = analyzeCourseOverlaps(allCoursesList);
  const overlapSummary = getOverlapSummary(degreePlan, allCoursesList);

  // Year names for display
  const yearNames = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year', 'Sixth Year', 'Seventh Year', 'Eighth Year'];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-wsu-crimson">Degree Planner</h2>
            <p className="text-gray-600">Track your progress toward graduation</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-wsu-crimson text-white rounded-lg hover:bg-wsu-crimson/90 transition-colors">
              Optimize Schedule
            </button>
            <button onClick={handleExportExcel} className="px-4 py-2 border border-wsu-crimson text-wsu-crimson rounded-lg hover:bg-wsu-crimson/10 transition-colors">
              Export
            </button>
            <button onClick={() => setShowImportModal(true)} className="px-4 py-2 border border-wsu-crimson text-wsu-crimson rounded-lg hover:bg-wsu-crimson/10 transition-colors">
              Import
            </button>
            <button onClick={handleResetAll} title="Reset degree planner and clear saved selections" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Reset Plan
            </button>
          </div>
        </div>

        {/* Stats Cards - 5 columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow" title="Click for grade scale">
            <div className="text-3xl font-bold text-gray-900">{totalGPA > 0 ? totalGPA.toFixed(2) : '—'}</div>
            <div className="text-sm text-gray-600">Cumulative GPA</div>
            <div className="text-xs text-gray-400 mt-1">Click for grade scale</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-green-600">{creditsEarned}</div>
            <div className="text-sm text-gray-600">Credits Achieved</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-blue-600">{creditsPlanned}</div>
            <div className="text-sm text-gray-600">Credits Planned</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-purple-600">{requiredCredits}</div>
            <div className="text-sm text-gray-600">Credits Required</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`text-2xl font-bold ${creditsEarned >= requiredCredits ? 'text-green-600' : 'text-gray-400'}`}>
              {creditsEarned >= requiredCredits ? 'Complete' : 'In Progress'}
            </div>
            <div className="text-sm text-gray-600">Ready to Graduate</div>
          </div>
        </div>
      </div>

      {/* Degree Selection Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-wsu-crimson mb-2">Select Your Degree Program</h3>
        <p className="text-gray-600 mb-4">Choose your degree to track your progress toward graduation</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Year</label>
            <select
              aria-label="Catalog Year"
              value={catalogYear}
              onChange={(e) => setCatalogYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            >
              {['2025', '2024', '2023', '2022', '2021', '2020'].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Degrees</label>
            <input
              type="text"
              value={degreeSearch}
              onChange={(e) => setDegreeSearch(e.target.value)}
              placeholder="Computer Science, Engineering, Biology..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            />
          </div>
        </div>

        {loading && <p className="text-gray-500">Searching...</p>}

        {degrees.length > 0 && (
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-4">
            {degrees.map(degree => (
              <button
                key={degree.id}
                onClick={() => {
                  setSelectedDegree(degree);
                  setDegreeSearch(degree.name);
                  setDegrees([]);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium">{degree.name}</div>
                {degree.credits && <div className="text-sm text-gray-500">{degree.credits} credits</div>}
              </button>
            ))}
          </div>
        )}

        {selectedDegree && (
          <div className="bg-wsu-crimson/10 border border-wsu-crimson/30 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-wsu-crimson">{selectedDegree.name}</h4>
                <p className="text-sm text-gray-600">{selectedDegree.college}</p>
              </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedDegree(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
            </div>
          </div>
        )}

          {/* Additional selected programs (majors/minors/certificates) */}
          {[...(additionalMajors || []), ...(minors || []), ...(certificates || [])].length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Programs</h4>
              <div className="flex flex-wrap gap-2">
                {additionalMajors.map(m => (
                  <span key={`maj-${m.id}`} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-sm">
                    <span className="font-medium">{m.name}</span>
                    <button onClick={() => removeProgram('major', m.id)} title="Remove major" className="text-gray-500 hover:text-red-600">×</button>
                  </span>
                ))}

                {minors.map(m => (
                  <span key={`min-${m.id}`} className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-100 rounded-full text-sm">
                    <span className="font-medium">{m.name}</span>
                    <button onClick={() => removeProgram('minor', m.id)} title="Remove minor" className="text-gray-500 hover:text-red-600">×</button>
                  </span>
                ))}

                {certificates.map(c => (
                  <span key={`cert-${c.id}`} className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-full text-sm">
                    <span className="font-medium">{c.name}</span>
                    <button onClick={() => removeProgram('certificate', c.id)} title="Remove certificate" className="text-gray-500 hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

        {!selectedDegree && degreeSearch.length < 2 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 font-medium">Start typing to search for your degree program</p>
            <p className="text-sm text-gray-500 mt-1">e.g., "Computer Science", "Nursing", "Business"</p>
          </div>
        )}
      </div>

      {/* Year Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {years.map((year, index) => (
          <button
            key={year.id}
            onClick={() => setActiveYear(year.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeYear === year.id
                ? 'bg-wsu-crimson text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {yearNames[index] || `Year ${index + 1}`}
          </button>
        ))}
        <button
          onClick={() => {
            const newYear = {
              id: years.length + 1,
              name: `${2024 + years.length}-${2025 + years.length}`
            };
            setYears([...years, newYear]);
          }}
          className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add Year
        </button>
      </div>

      {/* Semester Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Fall', 'Spring', 'Summer'].map(semester => {
          const key = `${activeYear}-${semester}`;
          const semesterCourses = courses[key] || [];

          // Calculate semester stats
          const semCredits = semesterCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);
          const semGPA = calculateGPA(semesterCourses.filter(c => c.status === 'completed'));

          return (
            <div key={semester} className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-wsu-crimson">{semester}</h3>
                <div className="text-sm text-gray-500">{semCredits} credits</div>
              </div>

              <div className="space-y-2">
                {semesterCourses.map(course => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    yearId={activeYear}
                    semester={semester}
                    onChange={handleCourseChange}
                    onRemove={removeCourse}
                    onRetake={handleRetakeCourse}
                    onOpenGradeCalculator={handleOpenGradeCalculator}
                    courseInfo={courseInfo}
                  />
                ))}

                <button
                  onClick={() => addCourse(activeYear, semester)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-wsu-crimson hover:bg-gray-50 border-2 border-dashed border-gray-200 hover:border-wsu-crimson/30 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <span>+</span> Add Course
                </button>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Term GPA:</span>
                    <span className="font-bold">{semGPA > 0 ? semGPA.toFixed(2) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Credits:</span>
                    <span className="font-medium">{semCredits}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retake Modal */}
      {showRetakeModal && retakeCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-wsu-crimson mb-4">
              Schedule Retake: {retakeCourse.name}
            </h2>
            <p className="text-gray-600 mb-6">Select the semester you plan to retake this course:</p>

            <div className="space-y-2">
              {years.map(year => (
                <div key={year.id}>
                  <h3 className="font-semibold text-gray-700 mb-2">{year.name}</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['Fall', 'Spring', 'Summer'].map(semester => {
                      const key = `${year.id}-${semester}`;
                      const semCourses = courses[key] || [];
                      const totalCredits = semCourses.reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);

                      return (
                        <button
                          key={semester}
                          onClick={() => handleConfirmRetake(year.id, semester)}
                          className="p-3 border border-gray-200 rounded-lg hover:border-wsu-crimson hover:bg-wsu-crimson/5 text-left"
                        >
                          <div className="font-medium text-sm">{semester}</div>
                          <div className="text-xs text-gray-500">{totalCredits} credits</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowRetakeModal(false)}
              className="btn-outline w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-wsu-crimson mb-4">Import Degree Plan</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel File (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleImportExcel}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-wsu-crimson file:text-white hover:file:bg-red-800"
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Don't have a file? Download a blank template:</p>
                <button onClick={handleDownloadTemplate} className="btn-outline w-full text-sm">
                  📄 Download Blank Template
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowImportModal(false)}
              className="btn-outline w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grade Calculator Modal */}
      {showGradeCalculator && (
        <ClassGradeCalculator
          courseName={selectedCourseForCalc}
          onClose={() => setShowGradeCalculator(false)}
        />
      )}
    </div>
  );
}

// CourseRow Component
function CourseRow({ course, yearId, semester, onChange, onRemove, onRetake, onOpenGradeCalculator, courseInfo }) {
  const [showDescription, setShowDescription] = useState(false);

  const parsedCourse = course.name ? course.name.match(/^([A-Z]+)\s*(\d+)/i) : null;
  const infoKey = parsedCourse ? `${parsedCourse[1].toUpperCase()}${parsedCourse[2]}` : null;
  const info = infoKey ? courseInfo[infoKey] : null;

  const ucoreCategories = extractUCORECategories(course);
  const isChoice = course.name && course.name.includes(' or ');
  const needsRetake = course.grade && ['D+', 'D', 'F'].includes(course.grade) && course.status === 'completed';

  return (
    <div className="space-y-1">
      <div className="group relative border border-gray-200 rounded-lg p-3 hover:border-wsu-crimson/30 hover:shadow-sm transition-all bg-white">
        {/* Remove button */}
        <button
          onClick={() => onRemove(yearId, semester, course.id)}
          className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-all shadow-md z-10"
          title="Remove course"
        >
          ×
        </button>

        {/* Retake badge */}
        {course.isRetake && (
          <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">
            RETAKE
          </div>
        )}

        {/* Course name input */}
        <div className="flex gap-2 items-center mb-2">
          <div className="flex-1 relative" style={{ minWidth: 0 }}>
            <textarea
              value={course.name}
              onChange={(e) => onChange(yearId, semester, course.id, 'name', e.target.value)}
              placeholder="Enter course name (e.g., CPTS 121)"
              rows={1}
              className={`w-full input-field text-base font-medium py-2 px-3 resize-none overflow-hidden pr-6 ${course.isRequired ? 'bg-blue-50 border-blue-200' : ''
                } ${isChoice ? 'border-yellow-300 bg-yellow-50' : ''}`}
              title={info?.title || ''}
              style={{ minWidth: '0', height: '40px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            {course.isRequired && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500" title="Required course">
                ⬤
              </span>
            )}
          </div>

          {/* Info and Calculator buttons */}
          <div className="flex gap-1 items-center" style={{ flexShrink: 0 }}>
            {/* Info button - only show if course data available */}
            {info && (
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded hover:bg-blue-50"
                title={showDescription ? 'Hide description' : 'Show description'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Calculator button - show for ANY course with a name */}
            {course.name && onOpenGradeCalculator && (
              <button
                onClick={() => onOpenGradeCalculator(course.name)}
                className="text-blue-600 hover:text-blue-700 transition-colors p-1.5 rounded hover:bg-blue-50 text-xl leading-none"
                title="Grade Calculator - Calculate what you need to get your desired grade"
              >
                🧮
              </button>
            )}

            {/* Inline Grade Calculator - always show for courses with names */}
            {course.name && (
              <InlineGradeCalculator course={course} onGradeChange={(grade) => onChange(yearId, semester, course.id, 'grade', grade)} />
            )}
          </div>
        </div>

        {/* UCORE badges */}
        {ucoreCategories.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {ucoreCategories.map(cat => (
              <span key={cat} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold border border-green-300">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Course fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Credits</label>
            <input
              type="number"
              value={course.credits}
              onChange={(e) => onChange(yearId, semester, course.id, 'credits', e.target.value)}
              placeholder="0-18"
              min="0"
              max="18"
              className="w-full input-field text-sm py-1.5 text-center"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select
              value={course.status}
              onChange={(e) => onChange(yearId, semester, course.id, 'status', e.target.value)}
              className="w-full input-field text-xs py-1.5"
            >
              <option value="not-taken">Not Taken</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select
              value={course.grade}
              onChange={(e) => onChange(yearId, semester, course.id, 'grade', e.target.value)}
              className="w-full input-field text-sm py-1.5"
              disabled={course.status === 'not-taken' || course.status === 'planned'}
            >
              <option value="">—</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B">B</option>
              <option value="B-">B-</option>
              <option value="C+">C+</option>
              <option value="C">C</option>
              <option value="C-">C-</option>
              <option value="D+">D+</option>
              <option value="D">D</option>
              <option value="F">F</option>
              <option value="S">S</option>
              <option value="U">U</option>
              <option value="W">W</option>
              <option value="I">I</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Points</label>
            <div className="w-full text-center py-1.5 text-sm font-medium text-gray-700">
              {course.grade && GRADE_POINTS[course.grade] !== undefined
                ? (GRADE_POINTS[course.grade] * (parseInt(course.credits) || 0)).toFixed(1)
                : '—'}
            </div>
          </div>
        </div>

        {/* Retake button for D/F grades */}
        {needsRetake && !course.isRetake && (
          <button
            onClick={() => onRetake(course)}
            className="mt-2 w-full py-1.5 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded font-medium"
          >
            📅 Schedule Retake
          </button>
        )}
      </div>

      {/* Course description */}
      {showDescription && info && (
        <div className="ml-3 text-xs text-gray-600 bg-blue-50 border-l-4 border-blue-400 pl-3 py-2 rounded-r">
          <div className="font-semibold text-blue-900">{info.title}</div>
          {info.description && <div className="mt-1">{info.description}</div>}
        </div>
      )}

      {/* Choice note */}
      {course.note && (
        <div className="ml-3 text-xs text-gray-600 bg-yellow-50 border-l-4 border-yellow-400 pl-3 py-2 rounded-r">
          <div className="mb-1 last:mb-0">
            <span className="font-semibold text-yellow-700">📌 Note:</span> {course.note}
          </div>
        </div>
      )}
    </div>
  );
}
