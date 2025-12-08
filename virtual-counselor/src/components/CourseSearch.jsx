import React, { useState, useEffect, useCallback } from 'react';
import { fetchCourses, fetchPrefixes as apiGetPrefixes, fetchTerms as apiGetTerms } from '../utils/api.js';
import { exportCoursesToExcel } from '../utils/excelExport.js';
import { extractUCORECategories, getUCOREBadgeColor } from '../utils/courseHelpers.js';
import WeeklyCalendar from './WeeklyCalendar';

function CourseSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  const [filters, setFilters] = useState({
    campus: '',
    term: '',
    year: new Date().getFullYear(),
    prefix: '',
    seatsAvailable: false
  });

  const [terms, setTerms] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  });

  // Load saved search state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wsu_vc_course_search');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
        if (parsed.filters) setFilters(parsed.filters);
        if (parsed.viewMode) setViewMode(parsed.viewMode);
        if (parsed.pagination) setPagination(prev => ({ ...prev, ...parsed.pagination }));
      }
    } catch (err) {
      console.warn('Failed to load saved course search', err);
    }
  }, []);

  // Persist search state
  useEffect(() => {
    try {
      const data = { searchQuery, filters, viewMode, pagination: { page: pagination.page, limit: pagination.limit } };
      localStorage.setItem('wsu_vc_course_search', JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save course search', err);
    }
  }, [searchQuery, filters, viewMode, pagination.page, pagination.limit]);

  // Fetch available terms and prefixes on mount
  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [termsData, prefixesData] = await Promise.all([
        apiGetTerms(),
        apiGetPrefixes()
      ]);
      setTerms(termsData || []);
      setPrefixes(prefixesData || []);
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  // Search courses when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2 || filters.prefix || filters.campus) {
        searchCoursesHandler();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters, pagination.page]);

  const searchCoursesHandler = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.campus && { campus: filters.campus }),
        ...(filters.term && { term: filters.term }),
        ...(filters.year && { year: filters.year }),
        ...(filters.prefix && { prefix: filters.prefix }),
        ...(filters.seatsAvailable && { seatsAvailable: 1 })
      };

      const data = await fetchCourses(params);
      setCourses(data.courses || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }));
    } catch (err) {
      console.error('Error searching courses:', err);
      setError('Failed to search courses. Make sure the backend is running.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (courses.length === 0) return;
    try {
      await exportCoursesToExcel(courses);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export courses.');
    }
  };

  const toggleCourseDetails = (courseId) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const getStatusColor = (seats) => {
    if (seats > 10) return 'bg-green-100 text-green-800';
    if (seats > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    searchCoursesHandler();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const uniqueCampuses = [...new Set(terms.map(t => t.campus))].filter(Boolean);
  const uniqueTermNames = [...new Set(terms.map(t => t.term))].filter(Boolean);
  const uniqueYears = [...new Set(terms.map(t => t.year))].sort((a, b) => b - a);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Search</h2>
          <p className="text-gray-600">Find courses across all WSU campuses</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-wsu-crimson shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-wsu-crimson shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 Calendar
            </button>
          </div>

          {courses.length > 0 && (
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-wsu-crimson text-wsu-crimson rounded-lg hover:bg-wsu-crimson/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to Excel
            </button>
          )}
          <button
            onClick={() => {
              // clear saved search
              localStorage.removeItem('wsu_vc_course_search');
              setSearchQuery('');
              setFilters({ campus: '', term: '', year: new Date().getFullYear(), prefix: '', seatsAvailable: false });
              setViewMode('list');
              setPagination({ page: 1, limit: 25, total: 0, totalPages: 0 });
              setCourses([]);
            }}
            title="Clear saved search and filters"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Saved Search
          </button>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Course name, number, or instructor..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            />
          </div>

          {/* Campus Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              aria-label="Select campus"
              value={filters.campus}
              onChange={(e) => handleFilterChange('campus', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            >
              <option value="">All Campuses</option>
              {uniqueCampuses.map(campus => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>
          </div>

          {/* Term Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              aria-label="Select term"
              value={filters.term}
              onChange={(e) => handleFilterChange('term', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            >
              <option value="">All Terms</option>
              {uniqueTermNames.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              aria-label="Select year"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            >
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Prefix Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              aria-label="Select subject"
              value={filters.prefix}
              onChange={(e) => handleFilterChange('prefix', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wsu-crimson focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {prefixes.map(p => {
                const subj = (p.subject || p.fullName || '').toString().trim();
                // Prefer showing the subject even when it only differs by case from the prefix
                // (e.g. show "ART - Art" instead of just "ART"). Use a case-sensitive
                // comparison so title-cased subjects are visible.
                const showSubject = subj && subj !== (p.prefix || '').toString().trim();
                const label = showSubject ? `${p.prefix} - ${subj} (${p.courseCount})` : `${p.prefix} (${p.courseCount})`;
                return (
                  <option key={p.prefix} value={p.prefix}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Seats Available Toggle */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.seatsAvailable}
                onChange={(e) => handleFilterChange('seatsAvailable', e.target.checked)}
                className="w-4 h-4 text-wsu-crimson border-gray-300 rounded focus:ring-wsu-crimson"
              />
              <span className="text-sm text-gray-700">Seats Available Only</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-wsu-crimson text-white rounded-lg hover:bg-wsu-crimson/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search Courses'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Results - Split View for Calendar Mode */}
      {viewMode === 'calendar' && courses.length > 0 ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          {/* Sidebar - Filters (visible on larger screens) */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-auto max-h-[600px]">
            <h3 className="font-semibold text-gray-900 mb-3">Filters & Results</h3>
            <div className="text-sm text-gray-600 mb-4">
              {courses.length} of {pagination.total} courses
            </div>
            <div className="space-y-2 divide-y divide-gray-100">
              {courses.map(course => (
                <div key={course.id || course.uniqueId} className="pt-2 first:pt-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">
                    {course.prefix} {course.courseNumber}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {course.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {course.dayTime || 'TBA'}
                  </div>
                  <div className="text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                      course.seatsAvailable > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {course.seatsAvailable > 0 ? `${course.seatsAvailable} seats` : 'Full'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Calendar View */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-full min-h-[600px]">
              <WeeklyCalendar courses={courses} />
            </div>
          </div>
        </div>
      ) : null}

      {/* List View */}
      {viewMode === 'list' && courses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm text-gray-600">
              Showing {courses.length} of {pagination.total} courses
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {courses.map(course => (
              <div key={course.id || course.uniqueId} className="p-4 hover:bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {course.prefix} {course.courseNumber} - {course.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {course.instructor || 'TBA'} | {course.credits} credits | {course.dayTime || 'TBA'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {course.campus} - {course.term} {course.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      course.seatsAvailable > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {course.seatsAvailable > 0 ? `${course.seatsAvailable} seats` : 'Full'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && courses.length === 0 && searchQuery && (
        <div className="text-center py-12 text-gray-500">
          <p>No courses found matching your search criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}

export default CourseSearch;
