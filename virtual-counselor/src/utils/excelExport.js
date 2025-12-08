// Excel export utility using ExcelJS (no vulnerabilities)
import ExcelJS from 'exceljs';

// Simple file download without file-saver dependency
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export degree plan to Excel
export async function exportDegreePlanToExcel(degreePlan, degreeName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Degree Plan');

  // Set column widths
  worksheet.columns = [
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Term', key: 'term', width: 12 },
    { header: 'Course', key: 'course', width: 15 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Credits', key: 'credits', width: 10 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Grade', key: 'grade', width: 10 },
  ];

  // Add header row with styling
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF981E32' }, // WSU Crimson
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Add degree plan data
  if (degreePlan && degreePlan.length > 0) {
    degreePlan.forEach(course => {
      worksheet.addRow({
        year: course.year || '',
        term: course.term || '',
        course: course.name || '',
        title: course.title || '',
        credits: course.credits || 0,
        status: course.status || 'not-taken',
        grade: course.grade || '',
      });
    });
  }

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Download file
  const filename = `${degreeName || 'Degree_Plan'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, filename);
}

// Export course search results to Excel
export async function exportCoursesToExcel(courses) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Courses');

  worksheet.columns = [
    { header: 'Prefix', key: 'prefix', width: 10 },
    { header: 'Number', key: 'number', width: 10 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Credits', key: 'credits', width: 10 },
    { header: 'Campus', key: 'campus', width: 15 },
    { header: 'Term', key: 'term', width: 12 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Seats Available', key: 'seats', width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF981E32' },
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  courses.forEach(course => {
    worksheet.addRow({
      prefix: course.prefix,
      number: course.courseNumber,
      title: course.title,
      credits: course.credits,
      campus: course.campus,
      term: course.term,
      year: course.year,
      seats: course.seatsAvail,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, `Course_Search_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export default {
  exportDegreePlanToExcel,
  exportCoursesToExcel,
};
