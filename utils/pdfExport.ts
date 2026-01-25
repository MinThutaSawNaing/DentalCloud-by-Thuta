import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient, Appointment, ClinicalRecord, Doctor, Medicine } from '../types';
import { formatCurrency, Currency } from './currency';

// Add type declaration for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export const exportPatientsToPDF = (patients: Patient[], currency: Currency) => {
  // Use all patients for export (not just filtered/paginated view)
  const exportPatients = patients;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Patient Directory Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Patients: ${patients.length}`, 14, 34);
  
  // Table
  autoTable(doc, {
    startY: 40,
    head: [['Patient Name', 'Contact', 'Email', 'Medical Status', 'Balance']],
    body: exportPatients.map(patient => [
      patient.name,
      patient.phone,
      patient.email || 'N/A',
      patient.medicalHistory ? 'Review Required' : 'No Alerts',
      formatCurrency(patient.balance || 0, currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 40 }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`patient-directory-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportAppointmentsToPDF = (appointments: Appointment[]) => {
  // Use all appointments for export (not just filtered/paginated view)
  const exportAppointments = appointments;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Appointments Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Appointments: ${appointments.length}`, 14, 34);
  
  // Upcoming Appointments
  const upcoming = exportAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= new Date() && apt.status === 'Scheduled';
  }).sort((a, b) => a.date.localeCompare(b.date));
  
  if (upcoming.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Upcoming Appointments', 14, 42);
    
    autoTable(doc, {
      startY: 46,
      head: [['Date', 'Time', 'Patient', 'Type', 'Doctor', 'Status']],
      body: upcoming.map(apt => [
        new Date(apt.date).toLocaleDateString(),
        apt.time,
        apt.patient_name || 'Unknown',
        apt.type || 'Checkup',
        apt.doctor_name ? `Dr. ${apt.doctor_name}` : 'N/A',
        apt.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
  }
  
  // Past Appointments
  const past = exportAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate < new Date() || apt.status !== 'Scheduled';
  }).sort((a, b) => b.date.localeCompare(a.date));
  
  if (past.length > 0) {
    const startY = upcoming.length > 0 ? (doc as any).lastAutoTable.finalY + 10 : 46;
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Past Appointments', 14, startY);
    
    autoTable(doc, {
      startY: startY + 4,
      head: [['Date', 'Time', 'Patient', 'Type', 'Status']],
      body: past.map(apt => [
        new Date(apt.date).toLocaleDateString(),
        apt.time,
        apt.patient_name || 'Unknown',
        apt.type || 'Checkup',
        apt.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [107, 114, 128], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`appointments-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportClinicalRecordsToPDF = (records: ClinicalRecord[], currency: Currency) => {
  // Use all records for export (not just filtered/paginated view)
  const exportRecords = records;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Clinical Records Audit Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Records: ${records.length}`, 14, 34);
  
  const totalRevenue = exportRecords.reduce((sum, rec) => sum + (rec.cost || 0), 0);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue, currency)}`, 14, 40);
  
  // Table
  autoTable(doc, {
    startY: 46,
    head: [['Date', 'Patient', 'Treatment', 'Teeth', 'Amount']],
    body: exportRecords.map(rec => [
      rec.date,
      rec.patient_name || 'Unknown',
      rec.description,
      rec.teeth && rec.teeth.length > 0 ? rec.teeth.join(', ') : 'General',
      formatCurrency(rec.cost || 0, currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`clinical-records-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportDoctorsToPDF = (doctors: Doctor[]) => {
  // Use all doctors for export (not just filtered/paginated view)
  const exportDoctors = doctors;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Doctors Directory Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Doctors: ${doctors.length}`, 14, 34);
  
  // Table
  autoTable(doc, {
    startY: 40,
    head: [['Doctor Name', 'Specialization', 'Contact', 'Email']],
    body: exportDoctors.map(doctor => [
      `Dr. ${doctor.name}`,
      doctor.specialization || 'General',
      doctor.phone || 'N/A',
      doctor.email || 'N/A'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`doctors-directory-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportInventoryToPDF = (medicines: Medicine[], currency: Currency) => {
  // Use all medicines for export (not just filtered/paginated view)
  const exportMedicines = medicines;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Medicine Inventory Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Items: ${medicines.length}`, 14, 34);
  
  const totalValue = medicines.reduce((sum, med) => sum + ((med.price || 0) * (med.stock || 0)), 0);
  doc.text(`Total Inventory Value: ${formatCurrency(totalValue, currency)}`, 14, 40);
  
  // Low Stock Items
  const lowStock = medicines.filter(med => med.min_stock !== undefined && med.stock <= med.min_stock);
  if (lowStock.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text(`⚠ ${lowStock.length} item(s) low in stock`, 14, 46);
  }
  
  // Table
  autoTable(doc, {
    startY: 52,
    head: [['Medicine', 'Category', 'Unit', 'Price', 'Stock', 'Min Stock', 'Value']],
    body: exportMedicines.map(med => [
      med.name,
      med.category || 'N/A',
      med.unit,
      formatCurrency(med.price || 0, currency),
      `${med.stock} ${med.unit}`,
      med.min_stock !== undefined ? `${med.min_stock} ${med.unit}` : 'N/A',
      formatCurrency((med.price || 0) * (med.stock || 0), currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      3: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
};
