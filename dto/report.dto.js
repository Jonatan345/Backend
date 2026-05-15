// dto/report.dto.js

function validateReportQueryDto(query) {
  const { startDate, endDate, categoryId, supplierId, type } = query;
  const errors = [];

  if (startDate && isNaN(Date.parse(startDate))) errors.push("startDate invalid format");
  if (endDate && isNaN(Date.parse(endDate))) errors.push("endDate invalid format");
  if (startDate && endDate && new Date(startDate) > new Date(endDate))
    errors.push("startDate must be before endDate");
  if (type && !["in", "out", "all"].includes(type))
    errors.push("type must be 'in', 'out', or 'all'");

  return { valid: errors.length === 0, errors };
}

module.exports = { validateReportQueryDto };