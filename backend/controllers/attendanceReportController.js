const Event = require('../models/event');
const Registration = require('../models/registration');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate comprehensive attendance report
exports.generateAttendanceReport = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { format = 'pdf' } = req.query; // pdf, excel, csv
    const userId = req.user._id;

    // Get event details
    const event = await Event.findById(eventId)
      .populate('organization', 'name')
      .populate('createdBy', 'name username email')
      .populate('organizerTeam.user', 'name username email phone profileImage');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check authorization (only organizers can download reports)
    const isCreator = event.createdBy._id.toString() === userId.toString();
    const isOrganizer = event.organizerTeam.some(obj => 
      obj.user && obj.user._id.toString() === userId.toString()
    );

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Not authorized to download attendance report' });
    }

    // Get all registrations for this event
    const registrations = await Registration.find({ eventId })
      .populate('volunteerId', 'name username email phone profileImage');

    // Get organizer team IDs
    const organizerTeamIds = event.organizerTeam.map(obj => obj.user._id.toString());
    
    // Get removed and banned volunteer IDs
    const removedVolunteerIds = event?.removedVolunteers?.map(id => id.toString()) || [];
    const bannedVolunteerIds = event?.bannedVolunteers?.map(id => id.toString()) || [];

    // Filter volunteer registrations (exclude organizers, removed, banned)
    const volunteerRegistrations = registrations.filter(r => {
      // For deleted users, use volunteerInfo.userId
      const volunteerId = r.isUserDeleted && r.volunteerInfo ? 
        r.volunteerInfo.userId.toString() : 
        (r.volunteerId && r.volunteerId._id ? r.volunteerId._id.toString() : null);
      
      if (!volunteerId) return false;
      
      return !organizerTeamIds.includes(volunteerId) && 
             !removedVolunteerIds.includes(volunteerId) && 
             !bannedVolunteerIds.includes(volunteerId);
    });

    // Prepare organizer data
    const organizerData = event.organizerTeam.map(obj => {
      let userInfo = {};
      if (obj.isUserDeleted && obj.userInfo) {
        // Use anonymized data for deleted users
        userInfo = {
          id: obj.userInfo.userId,
          name: obj.userInfo.name || 'Deleted User',
          username: obj.userInfo.username || 'deleted_user',
          email: 'N/A',
          phone: 'N/A'
        };
      } else if (obj.user) {
        // Use actual user data for active users
        userInfo = {
          id: obj.user._id,
          name: obj.user.name || 'N/A',
          username: obj.user.username || 'N/A',
          email: obj.user.email || 'N/A',
          phone: obj.user.phone || 'N/A'
        };
      } else {
        // Fallback for edge cases
        userInfo = {
          id: 'unknown',
          name: 'Unknown User',
          username: 'unknown',
          email: 'N/A',
          phone: 'N/A'
        };
      }
      
      return {
        id: userInfo.id,
        name: userInfo.name,
        username: userInfo.username,
        email: userInfo.email,
        phone: userInfo.phone,
        role: userInfo.id.toString() === (event.creatorInfo?.userId?.toString() || event.createdBy?.toString()) ? 'Creator' : 'Organizer',
        hasAttended: obj.hasAttended,
        inTime: null, // Organizers don't have inTime/outTime
        outTime: null,
        status: obj.hasAttended ? 'Present' : 'Absent'
      };
    });

    // Prepare volunteer data
    const volunteerData = volunteerRegistrations.map(r => {
      const hasAttended = r.hasAttended;
      const inTime = r.inTime;
      const outTime = r.outTime;
      
      let status = 'Absent';
      if (hasAttended && inTime && !outTime) {
        status = 'Present';
      } else if (hasAttended && inTime && outTime) {
        status = 'Checked Out';
      } else if (hasAttended && !inTime) {
        status = 'Marked Present (No Time)';
      }

      let userInfo = {};
      if (r.isUserDeleted && r.volunteerInfo) {
        // Use anonymized data for deleted users
        userInfo = {
          id: r.volunteerInfo.userId,
          name: r.volunteerInfo.name || 'Deleted User',
          username: r.volunteerInfo.username || 'deleted_user',
          email: 'N/A',
          phone: 'N/A'
        };
      } else if (r.volunteerId) {
        // Use actual user data for active users
        userInfo = {
          id: r.volunteerId._id,
          name: r.volunteerId.name || 'N/A',
          username: r.volunteerId.username || 'N/A',
          email: r.volunteerId.email || 'N/A',
          phone: r.volunteerId.phone || 'N/A'
        };
      } else {
        // Fallback for edge cases
        userInfo = {
          id: 'unknown',
          name: 'Unknown User',
          username: 'unknown',
          email: 'N/A',
          phone: 'N/A'
        };
      }
      
      return {
        id: userInfo.id,
        name: userInfo.name,
        username: userInfo.username,
        email: userInfo.email,
        phone: userInfo.phone,
        role: 'Volunteer',
        hasAttended,
        inTime,
        outTime,
        status,
        registrationDate: r.createdAt
      };
    });

    // Calculate statistics
    const totalParticipants = organizerData.length + volunteerData.length;
    const totalPresent = organizerData.filter(o => o.hasAttended).length + 
                        volunteerData.filter(v => v.hasAttended).length;
    const totalAbsent = totalParticipants - totalPresent;
    const attendanceRate = totalParticipants > 0 ? Math.round((totalPresent / totalParticipants) * 100) : 0;

    const reportData = {
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        organization: event.organization?.name || 'N/A',
        createdBy: event.createdBy.name || event.createdBy.username || 'N/A'
      },
      statistics: {
        totalParticipants,
        totalPresent,
        totalAbsent,
        attendanceRate,
        organizers: {
          total: organizerData.length,
          present: organizerData.filter(o => o.hasAttended).length,
          absent: organizerData.filter(o => !o.hasAttended).length
        },
        volunteers: {
          total: volunteerData.length,
          present: volunteerData.filter(v => v.hasAttended).length,
          absent: volunteerData.filter(v => !v.hasAttended).length,
          checkedOut: volunteerData.filter(v => v.outTime).length
        }
      },
      organizers: organizerData,
      volunteers: volunteerData,
      generatedAt: new Date(),
      generatedBy: req.user.name || req.user.username || 'N/A'
    };

    // Generate report based on format
    switch (format.toLowerCase()) {
      case 'excel':
        return await generateExcelReport(reportData, res);
      case 'csv':
        return await generateCSVReport(reportData, res);
      case 'pdf':
      default:
        return await generatePDFReport(reportData, res);
    }

  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate attendance report',
      error: error.message 
    });
  }
};

// Generate Excel report
const generateExcelReport = async (data, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Add metadata
    workbook.creator = 'EnviBuddies';
    workbook.lastModifiedBy = data.generatedBy;
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create summary worksheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Add title
    const titleRow = summarySheet.addRow(['Attendance Report']);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    summarySheet.mergeCells('A1:H1');
    summarySheet.addRow([data.event.title]);
    summarySheet.mergeCells('A2:H2');
    summarySheet.addRow([]);

    // Add event information
    summarySheet.addRow(['Event Information']);
    summarySheet.addRow(['Title', data.event.title]);
    summarySheet.addRow(['Description', data.event.description]);
    summarySheet.addRow(['Location', data.event.location]);
    summarySheet.addRow(['Start Date', new Date(data.event.startDateTime).toLocaleString()]);
    summarySheet.addRow(['End Date', new Date(data.event.endDateTime).toLocaleString()]);
    summarySheet.addRow(['Organization', data.event.organization]);
    summarySheet.addRow(['Created By', data.event.createdBy]);
    summarySheet.addRow([]);

    // Add statistics with styling
    summarySheet.addRow(['Attendance Statistics']);
    summarySheet.addRow(['Total Participants', data.statistics.totalParticipants]);
    summarySheet.addRow(['Total Present', data.statistics.totalPresent]);
    summarySheet.addRow(['Total Absent', data.statistics.totalAbsent]);
    summarySheet.addRow(['Attendance Rate', `${data.statistics.attendanceRate}%`]);
    summarySheet.addRow([]);

    // Add detailed statistics
    summarySheet.addRow(['Organizer Statistics']);
    summarySheet.addRow(['Total Organizers', data.statistics.organizers.total]);
    summarySheet.addRow(['Present', data.statistics.organizers.present]);
    summarySheet.addRow(['Absent', data.statistics.organizers.absent]);
    summarySheet.addRow([]);

    summarySheet.addRow(['Volunteer Statistics']);
    summarySheet.addRow(['Total Volunteers', data.statistics.volunteers.total]);
    summarySheet.addRow(['Present', data.statistics.volunteers.present]);
    summarySheet.addRow(['Absent', data.statistics.volunteers.absent]);
    summarySheet.addRow(['Checked Out', data.statistics.volunteers.checkedOut]);

    // Style summary sheet
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 40;

    // Create organizers worksheet
    const organizersSheet = workbook.addWorksheet('Organizers');
    
    // Add headers
    const organizerHeaders = ['Name', 'Username', 'Email', 'Phone', 'Role', 'Status'];
    const organizerHeaderRow = organizersSheet.addRow(organizerHeaders);
    organizerHeaderRow.font = { bold: true };
    organizerHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.organizers.forEach(org => {
      const row = organizersSheet.addRow([
        org.name,
        org.username,
        org.email,
        org.phone,
        org.role,
        org.status
      ]);
      
      // Color code status
      if (org.status === 'Present') {
        row.getCell(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else {
        row.getCell(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFB6C1' }
        };
      }
    });

    // Style organizers sheet
    organizerHeaders.forEach((_, index) => {
      organizersSheet.getColumn(index + 1).width = 20;
    });

    // Create volunteers worksheet
    const volunteersSheet = workbook.addWorksheet('Volunteers');
    
    // Add headers
    const volunteerHeaders = ['Name', 'Username', 'Email', 'Phone', 'Status', 'Check-in Time', 'Check-out Time', 'Registration Date'];
    const volunteerHeaderRow = volunteersSheet.addRow(volunteerHeaders);
    volunteerHeaderRow.font = { bold: true };
    volunteerHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.volunteers.forEach(vol => {
      const row = volunteersSheet.addRow([
        vol.name,
        vol.username,
        vol.email,
        vol.phone,
        vol.status,
        vol.inTime ? new Date(vol.inTime).toLocaleString() : 'N/A',
        vol.outTime ? new Date(vol.outTime).toLocaleString() : 'N/A',
        new Date(vol.registrationDate).toLocaleDateString('en-GB')
      ]);
      
      // Color code status
      const statusCell = row.getCell(5);
      if (vol.status === 'Present') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (vol.status === 'Checked Out') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF87CEEB' }
        };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFB6C1' }
        };
      }
    });

    // Style volunteers sheet
    volunteerHeaders.forEach((_, index) => {
      volunteersSheet.getColumn(index + 1).width = 20;
    });

    // Add borders to all sheets
    [summarySheet, organizersSheet, volunteersSheet].forEach(sheet => {
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${data.event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
  }
};

// Generate CSV report
const generateCSVReport = async (data, res) => {
  try {
    let csvContent = '';

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Add header
    csvContent += 'EnviBuddies - Attendance Report\n';
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    csvContent += `Generated by: ${data.generatedBy}\n`;
    csvContent += '\n';

    // Add event information
    csvContent += 'Event Information\n';
    csvContent += `Title,${escapeCSV(data.event.title)}\n`;
    csvContent += `Description,${escapeCSV(data.event.description)}\n`;
    csvContent += `Location,${escapeCSV(data.event.location)}\n`;
    csvContent += `Start Date,${escapeCSV(new Date(data.event.startDateTime).toLocaleString())}\n`;
    csvContent += `End Date,${escapeCSV(new Date(data.event.endDateTime).toLocaleString())}\n`;
    csvContent += `Organization,${escapeCSV(data.event.organization)}\n`;
    csvContent += `Created By,${escapeCSV(data.event.createdBy)}\n`;
    csvContent += '\n';

    // Add summary statistics
    csvContent += 'Summary Statistics\n';
    csvContent += `Total Participants,${data.statistics.totalParticipants}\n`;
    csvContent += `Total Present,${data.statistics.totalPresent}\n`;
    csvContent += `Total Absent,${data.statistics.totalAbsent}\n`;
    csvContent += `Attendance Rate,${data.statistics.attendanceRate}%\n`;
    csvContent += '\n';

    // Add detailed statistics
    csvContent += 'Organizer Statistics\n';
    csvContent += `Total Organizers,${data.statistics.organizers.total}\n`;
    csvContent += `Present,${data.statistics.organizers.present}\n`;
    csvContent += `Absent,${data.statistics.organizers.absent}\n`;
    csvContent += '\n';

    csvContent += 'Volunteer Statistics\n';
    csvContent += `Total Volunteers,${data.statistics.volunteers.total}\n`;
    csvContent += `Present,${data.statistics.volunteers.present}\n`;
    csvContent += `Absent,${data.statistics.volunteers.absent}\n`;
    csvContent += `Checked Out,${data.statistics.volunteers.checkedOut}\n`;
    csvContent += '\n';

    // Add organizers list with proper headers
    csvContent += '=== ORGANIZERS LIST ===\n';
    csvContent += 'Name,Username,Email,Phone,Role,Status\n';
    
    data.organizers.forEach(org => {
      csvContent += `${escapeCSV(org.name)},${escapeCSV(org.username)},${escapeCSV(org.email)},${escapeCSV(org.phone)},${escapeCSV(org.role)},${escapeCSV(org.status)}\n`;
    });
    csvContent += '\n';

    // Add volunteers list with proper headers
    csvContent += '=== VOLUNTEERS LIST ===\n';
    csvContent += 'Name,Username,Email,Phone,Status,Check-in Time,Check-out Time,Registration Date\n';
    
    data.volunteers.forEach(vol => {
      csvContent += `${escapeCSV(vol.name)},${escapeCSV(vol.username)},${escapeCSV(vol.email)},${escapeCSV(vol.phone)},${escapeCSV(vol.status)},${escapeCSV(vol.inTime ? new Date(vol.inTime).toLocaleString() : 'N/A')},${escapeCSV(vol.outTime ? new Date(vol.outTime).toLocaleString() : 'N/A')},${escapeCSV(new Date(vol.registrationDate).toLocaleDateString())}\n`;
    });

    // Add footer
    csvContent += '\n';
    csvContent += 'Report generated by EnviBuddies\n';
    csvContent += `Event: ${escapeCSV(data.event.title)}\n`;
            csvContent += `Date: ${new Date().toLocaleDateString('en-GB')}\n`;

    // Set response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${data.event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`);

    // Send CSV content
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating CSV report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate CSV report' });
  }
};

// Generate PDF report
const generatePDFReport = async (data, res) => {
  try {
    // Determine if we need landscape orientation
    const totalRows = data.organizers.length + data.volunteers.length;
    const useLandscape = totalRows > 20 || data.volunteers.length > 15;
    
    const doc = new PDFDocument({ 
      size: 'A4',
      layout: useLandscape ? 'landscape' : 'portrait',
      margins: { top: 25, bottom: 25, left: 25, right: 25 },
      autoFirstPage: true
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${data.event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
    doc.pipe(res);

    // Colors
    const colors = {
      primary: '#1e40af',
      secondary: '#374151',
      lightGray: '#f9fafb',
      white: '#ffffff',
      red: '#dc2626',
      green: '#059669',
      blue: '#2563eb',
      border: '#e5e7eb'
    };

    // Generate header
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    // Header
    doc
      .rect(0, 0, pageWidth, 50)
      .fill(colors.primary);
      
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fill(colors.white)
      .text('EnviBuddies - Attendance Report', 25, 15);
      
    doc
      .font('Helvetica')
      .fontSize(10)
      .fill(colors.white)
      .text(data.event.title, 25, 35);
      
    doc
      .font('Helvetica')
      .fontSize(8)
      .fill(colors.white)
              .text(`Generated: ${new Date().toLocaleDateString('en-GB')} by ${data.generatedBy}`, pageWidth - 200, 20, { align: 'right' });

    // Start content after header
    let y = 70;

    // Event Information
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fill(colors.primary)
      .text('Event Information', 25, y);
    y += 20;

    // Event details in two columns
    const col1X = 25;
    const col2X = pageWidth / 2;
    
    doc.font('Helvetica-Bold').fontSize(8).fill(colors.secondary).text('Event:', col1X, y);
    doc.font('Helvetica').fontSize(8).fill(colors.secondary).text(data.event.title, col1X + 60, y);
    
    doc.font('Helvetica-Bold').fontSize(8).fill(colors.secondary).text('Organization:', col2X, y);
    doc.font('Helvetica').fontSize(8).fill(colors.secondary).text(data.event.organization, col2X + 80, y);
    y += 12;
    
    doc.font('Helvetica-Bold').fontSize(8).fill(colors.secondary).text('Location:', col1X, y);
    doc.font('Helvetica').fontSize(8).fill(colors.secondary).text(data.event.location, col1X + 60, y);
    
    doc.font('Helvetica-Bold').fontSize(8).fill(colors.secondary).text('Created By:', col2X, y);
    doc.font('Helvetica').fontSize(8).fill(colors.secondary).text(data.event.createdBy, col2X + 80, y);
    y += 12;
    
    doc.font('Helvetica-Bold').fontSize(8).fill(colors.secondary).text('Start Time:', col1X, y);
    doc.font('Helvetica').fontSize(8).fill(colors.secondary).text(new Date(data.event.startDateTime).toLocaleString(), col1X + 60, y);
    
    doc.font('Helvetica-Bold').fontSize(8).fill(colors.secondary).text('End Time:', col2X, y);
    doc.font('Helvetica').fontSize(8).fill(colors.secondary).text(new Date(data.event.endDateTime).toLocaleString(), col2X + 80, y);
    y += 30;

    // Statistics
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fill(colors.primary)
      .text('Attendance Summary', 25, y);
    y += 20;

    // Statistics boxes
    const stats = [
      { label: 'Total', value: data.statistics.totalParticipants, color: colors.blue },
      { label: 'Present', value: data.statistics.totalPresent, color: colors.green },
      { label: 'Absent', value: data.statistics.totalAbsent, color: colors.red },
      { label: 'Rate', value: `${data.statistics.attendanceRate}%`, color: colors.primary }
    ];

    const boxWidth = (pageWidth - 50 - 30) / 4;
    const boxHeight = 35;
    
    stats.forEach((stat, i) => {
      const x = 25 + i * (boxWidth + 10);
      
      doc
        .rect(x, y, boxWidth, boxHeight)
        .fill(stat.color)
        .stroke(colors.border);
        
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fill(colors.white)
        .text(stat.label, x + 5, y + 5);
        
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fill(colors.white)
        .text(stat.value.toString(), x + 5, y + 18);
    });
    y += boxHeight + 20;

    // Detailed stats
    const detailWidth = (pageWidth - 50 - 10) / 2;
    
    doc
      .rect(25, y, detailWidth, 25)
      .fill(colors.red)
      .stroke(colors.border);
      
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fill(colors.white)
      .text(`Organizers: ${data.statistics.organizers.total} (${data.statistics.organizers.present} present)`, 30, y + 8);
      
    doc
      .rect(25 + detailWidth + 10, y, detailWidth, 25)
      .fill(colors.green)
      .stroke(colors.border);
      
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fill(colors.white)
      .text(`Volunteers: ${data.statistics.volunteers.total} (${data.statistics.volunteers.present} present)`, 35 + detailWidth, y + 8);
    y += 40;

    // Helper function to add page if needed
    const addPageIfNeeded = (requiredHeight) => {
      if (y + requiredHeight > pageHeight - 50) {
        doc.addPage();
        // Add header to new page
        doc
          .rect(0, 0, pageWidth, 50)
          .fill(colors.primary);
          
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fill(colors.white)
          .text('EnviBuddies - Attendance Report (Continued)', 25, 15);
          
        doc
          .font('Helvetica')
          .fontSize(8)
          .fill(colors.white)
          .text(`Page ${doc.page.number}`, pageWidth - 100, 20, { align: 'right' });
        y = 70;
        return true;
      }
      return false;
    };

    // Helper function to create table
    const createTable = (title, headers, rows, columnWidths) => {
      // Add title
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fill(colors.primary)
        .text(title, 25, y);
      y += 20;

      // Check if we need a new page for the table
      const headerHeight = 25;
      const rowHeight = 20;
      const estimatedHeight = headerHeight + (rows.length * rowHeight) + 20;
      addPageIfNeeded(estimatedHeight);

      // Calculate table width and adjust column widths
      const tableWidth = pageWidth - 50;
      const totalSpecifiedWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      const adjustedWidths = columnWidths.map(width => (width / totalSpecifiedWidth) * tableWidth);

      // Draw header
      doc
        .rect(25, y, tableWidth, headerHeight)
        .fill(colors.primary)
        .stroke(colors.border);

      let currentX = 25;
      headers.forEach((header, i) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fill(colors.white)
          .text(header, currentX + 5, y + 8, { 
            width: adjustedWidths[i] - 10, 
            align: 'left' 
          });
        currentX += adjustedWidths[i];
      });
      y += headerHeight;

      // Draw rows
      rows.forEach((row, rowIndex) => {
        // Check for page break
        if (y + rowHeight > pageHeight - 50) {
          doc.addPage();
          // Add header to new page
          doc
            .rect(0, 0, pageWidth, 50)
            .fill(colors.primary);
            
          doc
            .font('Helvetica-Bold')
            .fontSize(16)
            .fill(colors.white)
            .text('EnviBuddies - Attendance Report (Continued)', 25, 15);
            
          doc
            .font('Helvetica')
            .fontSize(8)
            .fill(colors.white)
            .text(`Page ${doc.page.number}`, pageWidth - 100, 20, { align: 'right' });
          y = 70;

          // Redraw table header
          doc
            .rect(25, y, tableWidth, headerHeight)
            .fill(colors.primary)
            .stroke(colors.border);

          currentX = 25;
          headers.forEach((header, i) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(8)
              .fill(colors.white)
              .text(header, currentX + 5, y + 8, { 
                width: adjustedWidths[i] - 10, 
                align: 'left' 
              });
            currentX += adjustedWidths[i];
          });
          y += headerHeight;
        }

        // Row background
        const fillColor = rowIndex % 2 === 0 ? colors.lightGray : colors.white;
        doc
          .rect(25, y, tableWidth, rowHeight)
          .fill(fillColor)
          .stroke(colors.border);

        // Row content
        currentX = 25;
        row.forEach((cell, i) => {
          doc
            .font('Helvetica')
            .fontSize(7)
            .fill(colors.secondary)
            .text(cell.toString(), currentX + 5, y + 6, { 
              width: adjustedWidths[i] - 10, 
              align: 'left' 
            });
          currentX += adjustedWidths[i];
        });

        y += rowHeight;
      });

      y += 20; // Space after table
    };

    // Create Organizers table
    const organizerHeaders = ['Name', 'Username', 'Email', 'Phone', 'Role', 'Status'];
    const organizerRows = data.organizers.map(org => [
      org.name, org.username, org.email, org.phone, org.role, org.status
    ]);
    const organizerColumnWidths = [100, 80, 140, 80, 60, 70];
    
    createTable('Organizers List', organizerHeaders, organizerRows, organizerColumnWidths);

    // Create Volunteers table
    const volunteerHeaders = ['Name', 'Username', 'Email', 'Phone', 'Status', 'Check-in Time', 'Check-out Time'];
    const volunteerRows = data.volunteers.map(vol => [
      vol.name,
      vol.username,
      vol.email,
      vol.phone,
      vol.status,
      vol.inTime ? new Date(vol.inTime).toLocaleString() : 'N/A',
      vol.outTime ? new Date(vol.outTime).toLocaleString() : 'N/A'
    ]);
    const volunteerColumnWidths = [90, 70, 120, 70, 60, 100, 100];
    
    createTable('Volunteers List', volunteerHeaders, volunteerRows, volunteerColumnWidths);

    // Add footer to last page - ensure it stays on the same page
    const footerY = Math.min(y + 20, pageHeight - 30); // Use current position or max 30px from bottom
    
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fill(colors.secondary)
      .text(
        `EnviBuddies - Empowering Community Service`,
        25,
        footerY,
        { align: 'center', width: pageWidth - 50 }
      );

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
};

// Export is already done at the top with exports.generateAttendanceReport

