// GET /api/export?month=1&year=2025&format=pdf|csv|xlsx&employeeId=optional
// Generates legally compliant time-sheet reports (RD-ley 8/2019)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcBreakMinutes,
  calcEffectiveMinutes,
  minutesToHHMM,
  formatMadrid,
} from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Solo administradores pueden exportar registros" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const exportFormat = searchParams.get("format") ?? "pdf";
  const employeeId = searchParams.get("employeeId") ?? undefined;

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ error: "Parámetros de fecha inválidos" }, { status: 400 });
  }

  const companyId =
    session.user.role === "SUPERADMIN"
      ? (searchParams.get("companyId") ?? session.user.companyId)
      : session.user.companyId;

  const from = startOfMonth(new Date(year, month - 1, 1));
  const to = endOfMonth(from);
  const monthLabel = format(from, "MMMM yyyy", { locale: es });

  // Fetch company info
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  // Fetch logs
  const logs = await prisma.timeLog.findMany({
    where: {
      user: { companyId },
      workDate: { gte: from, lte: to },
      isCancelled: false,
      ...(employeeId ? { userId: employeeId } : {}),
    },
    include: {
      user: { select: { name: true, surname: true, username: true, position: true, department: true } },
      breaks: true,
    },
    orderBy: [{ user: { surname: "asc" } }, { workDate: "asc" }],
  });

  // Build row data
  interface ReportRow {
    employeeName: string;
    username: string;
    department: string;
    position: string;
    date: string;
    clockIn: string;
    clockOut: string;
    breakMinutes: number;
    effectiveMinutes: number | null;
    location: string;
    hasCorrection: boolean;
  }

  const rows: ReportRow[] = logs.map((l) => {
    const cin = l.adminCorrectedClockIn ?? l.clockIn;
    const cout = l.adminCorrectedClockOut ?? l.clockOut;
    const breakMins = calcBreakMinutes(l.breaks);
    const effectiveMins = calcEffectiveMinutes(cin, cout, l.breaks);
    const hasCorrection = !!(l.adminCorrectedClockIn || l.adminCorrectedClockOut);
    return {
      employeeName: `${l.user.surname}, ${l.user.name}`,
      username: l.user.username,
      department: l.user.department ?? "—",
      position: l.user.position ?? "—",
      date: format(l.workDate, "dd/MM/yyyy"),
      clockIn: formatMadrid(cin, "HH:mm"),
      clockOut: cout ? formatMadrid(cout, "HH:mm") : "—",
      breakMinutes: breakMins,
      effectiveMinutes: effectiveMins,
      location: locationLabel(l.location),
      hasCorrection,
    };
  });

  if (exportFormat === "csv" || exportFormat === "xlsx") {
    return generateSpreadsheet(rows, monthLabel, company?.name ?? "", exportFormat as "csv" | "xlsx");
  }

  return generatePDF(rows, monthLabel, company, session.user);
}

// ── PDF generation ────────────────────────────────────────────
async function generatePDF(
  rows: Array<{
    employeeName: string; username: string; department: string; position: string;
    date: string; clockIn: string; clockOut: string; breakMinutes: number;
    effectiveMinutes: number | null; location: string; hasCorrection: boolean;
  }>,
  monthLabel: string,
  company: { name: string; cif: string; address: string; city: string } | null,
  sessionUser: { name: string }
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // ── Header ──────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRO DE JORNADA", 148, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Empresa: ${company?.name ?? ""}`, 14, 28);
  doc.text(`CIF: ${company?.cif ?? ""}`, 14, 34);
  doc.text(`Dirección: ${company?.address ?? ""}, ${company?.city ?? ""}`, 14, 40);
  doc.text(`Período: ${monthLabel}`, 14, 46);
  doc.text(`Exportado el: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 200, 28, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "Documento generado conforme al Real Decreto-ley 8/2019 de 8 de marzo.",
    14, 52
  );
  doc.setTextColor(0);

  // Group rows by employee for subtotals
  const byEmployee = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    if (!acc[r.employeeName]) acc[r.employeeName] = [];
    acc[r.employeeName].push(r);
    return acc;
  }, {});

  let startY = 58;

  for (const [employeeName, empRows] of Object.entries(byEmployee)) {
    const sample = empRows[0];
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Empleado/a: ${employeeName}`, 14, startY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Usuario: ${sample.username}  |  Dpto: ${sample.department}  |  Cargo: ${sample.position}`, 14, startY + 5);

    const totalEffective = empRows.reduce((a, r) => a + (r.effectiveMinutes ?? 0), 0);
    const totalBreak = empRows.reduce((a, r) => a + r.breakMinutes, 0);

    autoTable(doc, {
      startY: startY + 9,
      head: [["Fecha", "Hora Entrada", "Hora Salida", "Pausa (min)", "Horas Efectivas", "Modalidad", "Correg."]],
      body: empRows.map((r) => [
        r.date,
        r.clockIn,
        r.clockOut,
        r.breakMinutes,
        r.effectiveMinutes !== null ? minutesToHHMM(r.effectiveMinutes) : "—",
        r.location,
        r.hasCorrection ? "★" : "",
      ]),
      foot: [[
        "TOTAL MES", "", "", totalBreak,
        minutesToHHMM(totalEffective), "", ""
      ]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [243, 244, 246], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: 24 },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 28, halign: "center" },
        5: { cellWidth: 28 },
        6: { cellWidth: 14, halign: "center" },
      },
      didParseCell(data) {
        // Highlight corrected rows in amber
        if (data.section === "body" && Array.isArray(data.row.raw) && data.row.raw[6] === "★") {
          data.cell.styles.fillColor = [254, 243, 199];
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 16;

    // ── Signature block (legally required) ──────────────────
    if (startY > 170) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Firma del empleado/a:", 14, startY);
    doc.line(14, startY + 14, 100, startY + 14);
    doc.text("Nombre y DNI:", 14, startY + 18);

    doc.text("Firma del representante de la empresa:", 150, startY);
    doc.line(150, startY + 14, 270, startY + 14);
    doc.text("Nombre, DNI y sello:", 150, startY + 18);

    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      "★ Registro modificado por RRHH. Consultar registro de auditoría para ver la justificación.",
      14, startY + 24
    );
    doc.setTextColor(0);

    startY += 34;
    if (startY > 175) { doc.addPage(); startY = 20; }
  }

  // ── Footer on all pages ──────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}  |  Generado por Registro de Jornada  |  RD-ley 8/2019`,
      148, 200, { align: "center" }
    );
    doc.setTextColor(0);
  }

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registro-jornada-${monthLabel.replace(/ /g, "-")}.pdf"`,
    },
  });
}

// ── Spreadsheet generation ────────────────────────────────────
function generateSpreadsheet(
  rows: Array<{
    employeeName: string; username: string; department: string; position: string;
    date: string; clockIn: string; clockOut: string; breakMinutes: number;
    effectiveMinutes: number | null; location: string; hasCorrection: boolean;
  }>,
  monthLabel: string,
  companyName: string,
  format: "csv" | "xlsx"
) {
  const headers = [
    "Empleado", "Usuario", "Departamento", "Cargo",
    "Fecha", "Hora Entrada", "Hora Salida",
    "Pausa (min)", "Horas Efectivas", "Modalidad", "Corrección RRHH"
  ];

  const data = [
    [`Empresa: ${companyName}`, `Período: ${monthLabel}`, "", "", "", "", "", "", "", "", ""],
    headers,
    ...rows.map((r) => [
      r.employeeName, r.username, r.department, r.position,
      r.date, r.clockIn, r.clockOut,
      r.breakMinutes,
      r.effectiveMinutes !== null ? minutesToHHMM(r.effectiveMinutes) : "",
      r.location,
      r.hasCorrection ? "Sí" : "No",
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = [
    { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 },
    { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Registro de Jornada");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registro-${monthLabel}.csv"`,
      },
    });
  }

  const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  return new NextResponse(xlsxBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="registro-${monthLabel}.xlsx"`,
    },
  });
}

function locationLabel(loc: string): string {
  const map: Record<string, string> = {
    OFFICE: "Oficina",
    REMOTE: "Teletrabajo",
    DISPLACEMENT: "Desplazamiento",
    OTHER: "Otro",
  };
  return map[loc] ?? loc;
}
