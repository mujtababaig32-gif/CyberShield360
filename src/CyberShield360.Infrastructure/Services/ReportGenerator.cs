using ClosedXML.Excel;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Enums;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CyberShield360.Infrastructure.Services;

public class ReportGenerator : IReportGenerator
{
    private const string DefaultBrand = "CyberShield360 By Mujtaba";
    private const string DefaultColor = "#10B5A6";
    private const string DarkHeader = "#0F172A";
    private const string DarkPanel = "#111827";
    private const string LightPanel = "#F8FAFC";

    public ReportGenerator() => QuestPDF.Settings.License = LicenseType.Community;

    public Task<byte[]> GeneratePdfAsync(ReportModel m, CancellationToken ct = default)
    {
        var color = CleanColor(m.PrimaryColorHex);
        var brand = string.IsNullOrWhiteSpace(m.BrandName) ? DefaultBrand : m.BrandName!;
        var title = string.IsNullOrWhiteSpace(m.Title) ? "Executive Security Assessment Report" : m.Title!;

        var reportFindings = m.Findings
            .Where(x => x.Severity != Severity.Info)
            .OrderBy(x => x.Passed)
            .ThenByDescending(x => SeverityRank(x.Severity))
            .ThenBy(x => x.Title)
            .ToList();

        var failed = reportFindings.Where(x => !x.Passed).ToList();
        var passed = reportFindings.Where(x => x.Passed).ToList();
        var highRisk = failed.Count(x => x.Severity is Severity.High or Severity.Critical);
        var totalChecks = reportFindings.Count;
        var riskLevel = GetRiskLevel(m.OverallScore, highRisk);

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Grey.Darken4));

                page.Header().Column(header =>
                {
                    header.Item().Background(DarkHeader).Padding(14).Row(row =>
                    {
                        row.ConstantItem(58).Background(color).Padding(7).Column(logo =>
                        {
                            logo.Item().AlignCenter().Text("CS").FontSize(18).Bold().FontColor(Colors.White);
                            logo.Item().AlignCenter().Text("360").FontSize(8).Bold().FontColor(Colors.White);
                        });

                        row.RelativeItem().PaddingLeft(12).Column(c =>
                        {
                            c.Item().Text(brand)
                                .FontSize(21)
                                .Bold()
                                .FontColor(Colors.White);

                            c.Item().PaddingTop(2).Text(title)
                                .FontSize(10)
                                .FontColor(Colors.Grey.Lighten2);

                            c.Item().PaddingTop(4).Text("Secure • Tenant-aware • Audit-ready")
                                .FontSize(8)
                                .FontColor(color);
                        });

                        row.ConstantItem(132).AlignRight().Column(c =>
                        {
                            c.Item().AlignRight().Text($"Grade {m.Grade}")
                                .FontSize(22)
                                .Bold()
                                .FontColor(color);

                            c.Item().AlignRight().Text($"Score {m.OverallScore}/100")
                                .FontSize(11)
                                .FontColor(Colors.White);

                            c.Item().PaddingTop(3).AlignRight().Text(riskLevel)
                                .FontSize(8)
                                .Bold()
                                .FontColor(Colors.Grey.Lighten2);
                        });
                    });

                    header.Item().Height(4).Background(color);
                });

                page.Content().PaddingVertical(14).Column(col =>
                {
                    col.Spacing(12);

                    col.Item().Background(LightPanel).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(12).Column(meta =>
                    {
                        meta.Spacing(5);

                        meta.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Client / Tenant").FontSize(7).Bold().FontColor(Colors.Grey.Darken1);
                                c.Item().Text(m.TenantName ?? "CyberShield360 Tenant").FontSize(10).Bold();
                            });

                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Asset / Domain").FontSize(7).Bold().FontColor(Colors.Grey.Darken1);
                                c.Item().Text(m.AssetDomain ?? "Unknown Asset").FontSize(10).Bold().FontColor(color);
                            });

                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Generated").FontSize(7).Bold().FontColor(Colors.Grey.Darken1);
                                c.Item().Text($"{m.GeneratedAtUtc:yyyy-MM-dd HH:mm} UTC").FontSize(9);
                            });
                        });

                        meta.Item().PaddingTop(6).Row(row =>
                        {
                            row.RelativeItem().Text($"Scan Type: {m.ScanType ?? "Security Scan"}")
                                .FontSize(8)
                                .FontColor(Colors.Grey.Darken1);

                            row.RelativeItem().Text($"Scan ID: {m.ScanId ?? "N/A"}")
                                .FontSize(8)
                                .FontColor(Colors.Grey.Darken1);
                        });

                        meta.Item().Text($"Data Source: {EmptyDash(m.DataSource)}")
                            .FontSize(8)
                            .FontColor(Colors.Grey.Darken1);

                        meta.Item().Text($"Accuracy Note: {EmptyDash(m.AccuracyNote)}")
                            .FontSize(8)
                            .Italic()
                            .FontColor(Colors.Grey.Darken1);
                    });

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Background(DarkPanel).Padding(12).Column(c =>
                        {
                            c.Item().Text("Executive Summary").FontSize(15).Bold().FontColor(Colors.White);
                            c.Item().PaddingTop(5).Text(GetExecutiveSummary(m.OverallScore, failed.Count, highRisk))
                                .FontSize(9)
                                .LineHeight(1.35f)
                                .FontColor(Colors.Grey.Lighten2);
                        });

                        row.ConstantItem(155).Background(color).Padding(12).Column(c =>
                        {
                            c.Item().Text("Business Risk").FontSize(8).Bold().FontColor(Colors.White);
                            c.Item().PaddingTop(6).Text(riskLevel).FontSize(18).Bold().FontColor(Colors.White);
                            c.Item().PaddingTop(5).Text(GetRiskAdvice(m.OverallScore, highRisk))
                                .FontSize(8)
                                .LineHeight(1.25f)
                                .FontColor(Colors.White);
                        });
                    });

                    col.Item().Row(row =>
                    {
                        MetricCard(row.RelativeItem(), "Overall Score", $"{m.OverallScore}/100", color);
                        MetricCard(row.RelativeItem(), "Total Checks", totalChecks.ToString(), Colors.Blue.Darken1);
                        MetricCard(row.RelativeItem(), "Passed", passed.Count.ToString(), Colors.Green.Darken1);
                        MetricCard(row.RelativeItem(), "Failed", failed.Count.ToString(), Colors.Red.Darken1);
                        MetricCard(row.RelativeItem(), "High/Critical", highRisk.ToString(), Colors.Orange.Darken2);
                    });

                    col.Item().PaddingTop(4).Text("Top Recommended Actions")
                        .FontSize(14)
                        .Bold()
                        .FontColor(color);

                    var topActions = failed
                        .Where(x => !string.IsNullOrWhiteSpace(x.Recommendation))
                        .Take(6)
                        .ToList();

                    if (topActions.Any())
                    {
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(64);
                                c.RelativeColumn(2);
                                c.RelativeColumn(3);
                            });

                            AddPdfHeader(table, color, "Priority", "Issue", "Recommended Fix");

                            foreach (var f in topActions)
                            {
                                AddPdfCell(table, GetPriority(f.Severity), true);
                                AddPdfCell(table, f.Title);
                                AddPdfCell(table, f.Recommendation ?? "-");
                            }
                        });
                    }
                    else
                    {
                        col.Item().Text("No urgent remediation actions were identified.")
                            .FontSize(9)
                            .FontColor(Colors.Grey.Darken1);
                    }

                    col.Item().PaddingTop(6).Text("Client-Friendly Remediation Plan")
                        .FontSize(14)
                        .Bold()
                        .FontColor(color);

                    col.Item().Text("Each failed check is translated into business impact, recommended fix, likely owner, difficulty, and training requirement.")
                        .FontSize(8)
                        .Italic()
                        .FontColor(Colors.Grey.Darken1);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(1);
                            c.RelativeColumn(2);
                            c.RelativeColumn(2);
                            c.RelativeColumn(2);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1);
                        });

                        AddPdfHeader(table, color, "Priority", "Issue", "Business Impact", "Recommended Fix", "Owner", "Training");

                        foreach (var f in failed.Take(18))
                        {
                            AddPdfCell(table, GetPriority(f.Severity), true);
                            AddPdfCell(table, f.Title);
                            AddPdfCell(table, GetBusinessImpact(f));
                            AddPdfCell(table, f.Recommendation ?? "Review and remediate this control.");
                            AddPdfCell(table, GetFixOwner(f));
                            AddPdfCell(table, GetTrainingRequired(f));
                        }
                    });

                    col.Item().PaddingTop(6).Text("Security Findings")
                        .FontSize(14)
                        .Bold()
                        .FontColor(color);

                    col.Item().Text("Failed checks are shown first to support remediation planning. Informational rows are hidden from the client report.")
                        .FontSize(8)
                        .Italic()
                        .FontColor(Colors.Grey.Darken1);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(2);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1);
                            c.RelativeColumn(3);
                        });

                        AddPdfHeader(table, color, "Check", "Severity", "Status", "Recommendation");

                        foreach (var f in reportFindings)
                        {
                            AddPdfCell(table, f.Title);
                            AddPdfCell(table, f.Severity.ToString(), true);
                            AddPdfCell(table, f.Passed ? "PASS" : "FAIL", true, f.Passed ? Colors.Green.Darken1 : Colors.Red.Darken1);
                            AddPdfCell(table, f.Passed ? "-" : (f.Recommendation ?? "-"));
                        }
                    });

                    col.Item().PaddingTop(8).Background("#ECFDF5").Border(1).BorderColor(Colors.Green.Lighten2).Padding(10).Text(
                        "Next Step: Apply approved fixes, rescan the asset, compare before/after score, and deliver the final improved report with handover guidance."
                    ).FontSize(9).Bold().FontColor(Colors.Green.Darken3);
                });

                page.Footer().Column(footer =>
                {
                    footer.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                    footer.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem()
                            .Text(m.FooterText ?? "Confidential Security Report - CyberShield360")
                            .FontSize(8)
                            .FontColor(Colors.Grey.Medium);

                        row.RelativeItem()
                            .AlignCenter()
                            .Text("CyberShield360 By Mujtaba")
                            .FontSize(8)
                            .Bold()
                            .FontColor(color);

                        row.ConstantItem(120)
                            .AlignRight()
                            .Text(text =>
                            {
                                text.Span("Page ").FontSize(8).FontColor(Colors.Grey.Medium);
                                text.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Medium);
                                text.Span(" of ").FontSize(8).FontColor(Colors.Grey.Medium);
                                text.TotalPages().FontSize(8).FontColor(Colors.Grey.Medium);
                            });
                    });
                });
            });
        });

        return Task.FromResult(doc.GeneratePdf());
    }

    public Task<byte[]> GenerateExcelAsync(ReportModel m, CancellationToken ct = default)
    {
        var color = CleanColor(m.PrimaryColorHex);
        var brand = string.IsNullOrWhiteSpace(m.BrandName) ? DefaultBrand : m.BrandName!;
        var title = string.IsNullOrWhiteSpace(m.Title) ? "Executive Security Assessment Report" : m.Title!;

        var reportFindings = m.Findings
            .Where(x => x.Severity != Severity.Info)
            .OrderBy(x => x.Passed)
            .ThenByDescending(x => SeverityRank(x.Severity))
            .ThenBy(x => x.Title)
            .ToList();

        var failed = reportFindings.Where(x => !x.Passed).ToList();
        var passed = reportFindings.Where(x => x.Passed).ToList();
        var highRisk = failed.Count(x => x.Severity is Severity.High or Severity.Critical);
        var totalChecks = reportFindings.Count;
        var riskLevel = GetRiskLevel(m.OverallScore, highRisk);

        using var wb = new XLWorkbook();
        wb.Properties.Author = brand;
        wb.Properties.Title = title;
        wb.Properties.Subject = "CyberShield360 Security Assessment Report";
        wb.Properties.Company = "CyberShield360 By Mujtaba";

        var summary = wb.Worksheets.Add("Executive Summary");
        BuildExecutiveSummarySheet(summary, m, brand, title, color, totalChecks, passed.Count, failed.Count, highRisk, riskLevel);

        var findings = wb.Worksheets.Add("Findings");
        BuildFindingsSheet(findings, reportFindings, color);

        var remediation = wb.Worksheets.Add("Remediation Plan");
        BuildRemediationSheet(remediation, failed, color);

        var raw = wb.Worksheets.Add("Raw Evidence");
        BuildRawEvidenceSheet(raw, reportFindings, color);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return Task.FromResult(ms.ToArray());
    }

    private static void MetricCard(IContainer container, string label, string value, string valueColor)
    {
        container.Border(1)
            .BorderColor(Colors.Grey.Lighten2)
            .Padding(8)
            .Column(c =>
            {
                c.Item().Text(label).FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                c.Item().PaddingTop(4).Text(value).FontSize(16).Bold().FontColor(valueColor);
            });
    }

    private static void AddPdfHeader(TableDescriptor table, string color, params string[] headers)
    {
        table.Header(header =>
        {
            foreach (var head in headers)
            {
                header.Cell()
                    .Background(color)
                    .Padding(5)
                    .Text(head)
                    .FontColor(Colors.White)
                    .Bold()
                    .FontSize(7);
            }
        });
    }

    private static void AddPdfCell(TableDescriptor table, string text, bool bold = false, string? fontColor = null)
    {
        var cell = table.Cell()
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten3)
            .Padding(5);

        var textDescriptor = cell.Text(string.IsNullOrWhiteSpace(text) ? "-" : text)
            .FontSize(7)
            .FontColor(fontColor ?? Colors.Grey.Darken4);

        if (bold)
            textDescriptor.Bold();
    }

    private static void BuildExecutiveSummarySheet(
        IXLWorksheet ws,
        ReportModel m,
        string brand,
        string title,
        string color,
        int totalChecks,
        int passed,
        int failed,
        int highRisk,
        string riskLevel)
    {
        BuildExcelHeader(ws, brand, title, color, "A1:F3");

        ws.Cell("A5").Value = "Client / Tenant";
        ws.Cell("B5").Value = m.TenantName ?? "CyberShield360 Tenant";
        ws.Cell("A6").Value = "Asset / Domain";
        ws.Cell("B6").Value = m.AssetDomain ?? "Unknown Asset";
        ws.Cell("A7").Value = "Scan Type";
        ws.Cell("B7").Value = m.ScanType ?? "Security Scan";
        ws.Cell("A8").Value = "Scan ID";
        ws.Cell("B8").Value = m.ScanId ?? "N/A";
        ws.Cell("A9").Value = "Generated UTC";
        ws.Cell("B9").Value = $"{m.GeneratedAtUtc:yyyy-MM-dd HH:mm} UTC";
        ws.Cell("A10").Value = "Data Source";
        ws.Cell("B10").Value = EmptyDash(m.DataSource);
        ws.Cell("A11").Value = "Accuracy Note";
        ws.Cell("B11").Value = EmptyDash(m.AccuracyNote);

        ws.Range("A5:A11").Style.Font.Bold = true;
        ws.Range("A5:B11").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        ws.Range("A5:B11").Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        ws.Range("A5:B11").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        AddSummaryMetric(ws, 5, 4, "Overall Score", $"{m.OverallScore}/100", color);
        AddSummaryMetric(ws, 6, 4, "Grade", m.Grade, color);
        AddSummaryMetric(ws, 7, 4, "Business Risk", riskLevel, color);
        AddSummaryMetric(ws, 8, 4, "Total Checks", totalChecks.ToString(), "#2563EB");
        AddSummaryMetric(ws, 9, 4, "Passed Checks", passed.ToString(), "#16A34A");
        AddSummaryMetric(ws, 10, 4, "Failed Checks", failed.ToString(), "#DC2626");
        AddSummaryMetric(ws, 11, 4, "High/Critical", highRisk.ToString(), "#EA580C");

        ws.Cell("A13").Value = "Executive Summary";
        ws.Cell("A13").Style.Font.Bold = true;
        ws.Cell("A13").Style.Font.FontSize = 14;
        ws.Cell("A13").Style.Font.FontColor = XLColor.FromHtml(color);

        ws.Range("A14:F16").Merge();
        ws.Cell("A14").Value = GetExecutiveSummary(m.OverallScore, failed, highRisk);
        ws.Cell("A14").Style.Alignment.WrapText = true;
        ws.Cell("A14").Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
        ws.Cell("A14").Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
        ws.Cell("A14").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

        ws.Cell("A18").Value = "Client Next Step";
        ws.Cell("A18").Style.Font.Bold = true;
        ws.Cell("A18").Style.Font.FontColor = XLColor.FromHtml(color);

        ws.Range("A19:F20").Merge();
        ws.Cell("A19").Value = "Apply approved fixes, rescan the asset, compare before/after score, and deliver the final improved report with client handover guidance.";
        ws.Cell("A19").Style.Alignment.WrapText = true;
        ws.Cell("A19").Style.Fill.BackgroundColor = XLColor.FromHtml("#ECFDF5");
        ws.Cell("A19").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

        FinalizeSheet(ws);
    }

    private static void BuildFindingsSheet(IXLWorksheet ws, List<FindingDto> findings, string color)
    {
        BuildExcelHeader(ws, DefaultBrand, "Security Findings", color, "A1:G3");

        var headers = new[]
        {
            "Check Key",
            "Finding",
            "Severity",
            "Status",
            "Business Impact",
            "Detail",
            "Recommended Fix"
        };

        AddExcelTableHeader(ws, 5, headers, color);

        var row = 5;

        foreach (var f in findings)
        {
            row++;
            ws.Cell(row, 1).Value = f.CheckKey;
            ws.Cell(row, 2).Value = f.Title;
            ws.Cell(row, 3).Value = f.Severity.ToString();
            ws.Cell(row, 4).Value = f.Passed ? "PASS" : "FAIL";
            ws.Cell(row, 5).Value = GetBusinessImpact(f);
            ws.Cell(row, 6).Value = f.Detail ?? "";
            ws.Cell(row, 7).Value = f.Passed ? "-" : (f.Recommendation ?? "");

            ApplySeverityStyle(ws.Cell(row, 3), f.Severity);
            ApplyStatusStyle(ws.Cell(row, 4), f.Passed);
        }

        FormatExcelTable(ws, 5, row, 7);
    }

    private static void BuildRemediationSheet(IXLWorksheet ws, List<FindingDto> failed, string color)
    {
        BuildExcelHeader(ws, DefaultBrand, "Remediation Plan", color, "A1:I3");

        var headers = new[]
        {
            "Priority",
            "Issue",
            "What This Means",
            "Business Impact",
            "Recommended Fix",
            "Difficulty",
            "Who Should Fix It",
            "Fix Status",
            "Training Required"
        };

        AddExcelTableHeader(ws, 5, headers, color);

        var row = 5;

        foreach (var f in failed)
        {
            row++;
            ws.Cell(row, 1).Value = GetPriority(f.Severity);
            ws.Cell(row, 2).Value = f.Title;
            ws.Cell(row, 3).Value = f.Detail ?? "The security control did not meet the expected posture rule.";
            ws.Cell(row, 4).Value = GetBusinessImpact(f);
            ws.Cell(row, 5).Value = f.Recommendation ?? "Review and remediate this control.";
            ws.Cell(row, 6).Value = GetDifficulty(f.Severity);
            ws.Cell(row, 7).Value = GetFixOwner(f);
            ws.Cell(row, 8).Value = "Open";
            ws.Cell(row, 9).Value = GetTrainingRequired(f);

            ApplyPriorityStyle(ws.Cell(row, 1), f.Severity);
        }

        FormatExcelTable(ws, 5, Math.Max(row, 6), 9);
    }

    private static void BuildRawEvidenceSheet(IXLWorksheet ws, List<FindingDto> findings, string color)
    {
        BuildExcelHeader(ws, DefaultBrand, "Raw Scan Evidence", color, "A1:F3");

        var headers = new[]
        {
            "Check Key",
            "Title",
            "Severity",
            "Passed",
            "Detail",
            "Recommendation"
        };

        AddExcelTableHeader(ws, 5, headers, color);

        var row = 5;

        foreach (var f in findings)
        {
            row++;
            ws.Cell(row, 1).Value = f.CheckKey;
            ws.Cell(row, 2).Value = f.Title;
            ws.Cell(row, 3).Value = f.Severity.ToString();
            ws.Cell(row, 4).Value = f.Passed ? "Yes" : "No";
            ws.Cell(row, 5).Value = f.Detail ?? "";
            ws.Cell(row, 6).Value = f.Recommendation ?? "";

            ApplySeverityStyle(ws.Cell(row, 3), f.Severity);
            ApplyStatusStyle(ws.Cell(row, 4), f.Passed);
        }

        FormatExcelTable(ws, 5, row, 6);
    }

    private static void BuildExcelHeader(IXLWorksheet ws, string brand, string title, string color, string mergeRange)
    {
        ws.Range(mergeRange).Merge();
        ws.Cell("A1").Value = "CS360  |  " + brand;
        ws.Cell("A1").Style.Fill.BackgroundColor = XLColor.FromHtml(DarkHeader);
        ws.Cell("A1").Style.Font.FontColor = XLColor.White;
        ws.Cell("A1").Style.Font.Bold = true;
        ws.Cell("A1").Style.Font.FontSize = 18;
        ws.Cell("A1").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        var titleRow = ws.Range("A3:F3");
        titleRow.Style.Fill.BackgroundColor = XLColor.FromHtml(color);
        titleRow.Style.Font.FontColor = XLColor.White;
        titleRow.Style.Font.Bold = true;

        ws.Cell("A3").Value = title;
        ws.Row(1).Height = 30;
        ws.Row(3).Height = 22;
    }

    private static void AddSummaryMetric(IXLWorksheet ws, int row, int col, string label, string value, string color)
    {
        ws.Cell(row, col).Value = label;
        ws.Cell(row, col + 1).Value = value;
        ws.Cell(row, col).Style.Font.Bold = true;
        ws.Cell(row, col + 1).Style.Font.Bold = true;
        ws.Cell(row, col + 1).Style.Font.FontColor = XLColor.FromHtml(color);
        ws.Range(row, col, row, col + 1).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        ws.Range(row, col, row, col + 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
    }

    private static void AddExcelTableHeader(IXLWorksheet ws, int row, string[] headers, string color)
    {
        for (var i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(row, i + 1);
            cell.Value = headers[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml(color);
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        }

        ws.Row(row).Height = 24;
    }

    private static void FormatExcelTable(IXLWorksheet ws, int headerRow, int lastRow, int lastColumn)
    {
        if (lastRow <= headerRow)
            lastRow = headerRow + 1;

        var range = ws.Range(headerRow, 1, lastRow, lastColumn);
        range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
        range.Style.Alignment.WrapText = true;
        range.SetAutoFilter();

        ws.SheetView.FreezeRows(headerRow);
        ws.Columns().AdjustToContents();

        for (var i = 1; i <= lastColumn; i++)
        {
            if (ws.Column(i).Width > 44)
                ws.Column(i).Width = 44;

            if (ws.Column(i).Width < 14)
                ws.Column(i).Width = 14;
        }

        ws.Rows().Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
    }

    private static void FinalizeSheet(IXLWorksheet ws)
    {
        ws.Columns().AdjustToContents();

        for (var i = 1; i <= 8; i++)
        {
            if (ws.Column(i).Width > 48)
                ws.Column(i).Width = 48;

            if (ws.Column(i).Width < 14)
                ws.Column(i).Width = 14;
        }

        ws.SheetView.FreezeRows(3);
        ws.Rows().Style.Alignment.WrapText = true;
    }

    private static void ApplySeverityStyle(IXLCell cell, Severity severity)
    {
        cell.Style.Font.Bold = true;
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        if (severity is Severity.Critical or Severity.High)
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEE2E2");
            cell.Style.Font.FontColor = XLColor.FromHtml("#991B1B");
        }
        else if (severity == Severity.Medium)
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");
            cell.Style.Font.FontColor = XLColor.FromHtml("#92400E");
        }
        else
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#ECFDF5");
            cell.Style.Font.FontColor = XLColor.FromHtml("#065F46");
        }
    }

    private static void ApplyStatusStyle(IXLCell cell, bool passed)
    {
        cell.Style.Font.Bold = true;
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        if (passed)
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#DCFCE7");
            cell.Style.Font.FontColor = XLColor.FromHtml("#166534");
        }
        else
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEE2E2");
            cell.Style.Font.FontColor = XLColor.FromHtml("#991B1B");
        }
    }

    private static void ApplyPriorityStyle(IXLCell cell, Severity severity)
    {
        cell.Style.Font.Bold = true;
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        if (severity is Severity.Critical or Severity.High)
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEE2E2");
            cell.Style.Font.FontColor = XLColor.FromHtml("#991B1B");
        }
        else if (severity == Severity.Medium)
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");
            cell.Style.Font.FontColor = XLColor.FromHtml("#92400E");
        }
        else
        {
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E0F2FE");
            cell.Style.Font.FontColor = XLColor.FromHtml("#075985");
        }
    }

    private static string GetExecutiveSummary(int score, int failedCount, int highRiskCount)
    {
        if (score >= 85)
            return $"The organization demonstrates a strong security posture. {failedCount} scanner rule failures were identified, with {highRiskCount} high/critical items requiring review. The priority is to close remaining control gaps and maintain the current posture through regular rescans.";

        if (score >= 70)
            return $"The organization has a moderate security posture. {failedCount} scanner rule failures were identified. Remediation should focus on high-impact issues first, then validation should be completed with a follow-up scan and updated report.";

        if (score >= 50)
            return $"The organization has elevated security risk. {failedCount} scanner rule failures were identified, including {highRiskCount} high/critical issues. Prompt remediation review is recommended to reduce business exposure and improve trust readiness.";

        return $"The organization has a weak security posture. {failedCount} scanner rule failures were identified, including {highRiskCount} high/critical issues. Immediate remediation review is strongly recommended before public launch or client-facing use.";
    }

    private static string GetRiskAdvice(int score, int highRiskCount)
    {
        if (highRiskCount > 0)
            return "Prioritize high and critical fixes before client handover.";

        if (score >= 85)
            return "Maintain posture with scheduled reviews and rescans.";

        if (score >= 70)
            return "Address remaining gaps and verify improvements.";

        return "Start remediation immediately and rescan after fixes.";
    }

    private static string GetRiskLevel(int score, int highRiskCount)
    {
        if (highRiskCount > 0 && score < 75)
            return "High Business Risk";

        if (score >= 85)
            return "Strong Posture";

        if (score >= 70)
            return "Moderate Risk";

        if (score >= 50)
            return "Elevated Risk";

        return "Critical Risk";
    }

    private static string GetPriority(Severity severity)
    {
        return severity switch
        {
            Severity.Critical => "Critical",
            Severity.High => "High",
            Severity.Medium => "Medium",
            Severity.Low => "Low",
            _ => "Review"
        };
    }

    private static string GetDifficulty(Severity severity)
    {
        return severity switch
        {
            Severity.Critical => "High",
            Severity.High => "Medium",
            Severity.Medium => "Medium",
            Severity.Low => "Low",
            _ => "Low"
        };
    }

    private static string GetTrainingRequired(FindingDto f)
    {
        var text = $"{f.CheckKey} {f.Title}".ToLowerInvariant();

        if (text.Contains("dmarc") || text.Contains("spf") || text.Contains("dkim") || text.Contains("phish") || text.Contains("email"))
            return "Yes";

        if (text.Contains("admin") || text.Contains("password") || text.Contains("auth") || text.Contains("login"))
            return "Yes";

        return f.Severity is Severity.High or Severity.Critical ? "Recommended" : "No";
    }

    private static string GetFixOwner(FindingDto f)
    {
        var text = $"{f.CheckKey} {f.Title}".ToLowerInvariant();

        if (text.Contains("dmarc") || text.Contains("spf") || text.Contains("dkim") || text.Contains("dns"))
            return "DNS / IT Admin";

        if (text.Contains("ssl") || text.Contains("tls") || text.Contains("certificate"))
            return "Hosting / DevOps";

        if (text.Contains("header") || text.Contains("cors") || text.Contains("cookie") || text.Contains("web"))
            return "Web Developer";

        if (text.Contains("admin") || text.Contains("login") || text.Contains("auth"))
            return "Website Admin";

        return "Security / IT Owner";
    }

    private static string GetBusinessImpact(FindingDto f)
    {
        var text = $"{f.CheckKey} {f.Title} {f.Detail}".ToLowerInvariant();

        if (text.Contains("dmarc") || text.Contains("spf") || text.Contains("dkim") || text.Contains("spoof"))
            return "Attackers may send fake emails that appear to come from the company, which can damage trust and enable fraud.";

        if (text.Contains("ssl") || text.Contains("tls") || text.Contains("certificate"))
            return "Visitors may lose trust or face insecure connection warnings if encryption is weak or misconfigured.";

        if (text.Contains("header") || text.Contains("csp") || text.Contains("x-frame") || text.Contains("hsts"))
            return "Missing browser protections can increase exposure to common web attacks and weaken customer trust.";

        if (text.Contains("cors"))
            return "Overly permissive cross-origin settings may expose application data to untrusted websites.";

        if (text.Contains("cookie"))
            return "Weak cookie protection may increase the risk of session theft or account abuse.";

        if (text.Contains("admin") || text.Contains("login") || text.Contains("auth"))
            return "Exposed or weak login surfaces can increase brute-force attempts and unauthorized access risk.";

        if (text.Contains("dns"))
            return "DNS gaps can affect email trust, domain reputation, and service reliability.";

        return f.Severity is Severity.High or Severity.Critical
            ? "This issue can create meaningful business, trust, or security exposure and should be reviewed urgently."
            : "This issue should be reviewed as part of the normal security improvement plan.";
    }

    private static int SeverityRank(Severity severity)
    {
        return severity switch
        {
            Severity.Critical => 5,
            Severity.High => 4,
            Severity.Medium => 3,
            Severity.Low => 2,
            _ => 1
        };
    }

    private static string CleanColor(string? color)
    {
        return string.IsNullOrWhiteSpace(color) ? DefaultColor : color!;
    }

    private static string EmptyDash(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? "-" : value;
    }
}
