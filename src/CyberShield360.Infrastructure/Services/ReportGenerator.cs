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
    public ReportGenerator() => QuestPDF.Settings.License = LicenseType.Community;

    public Task<byte[]> GeneratePdfAsync(ReportModel m, CancellationToken ct = default)
    {
        var color = string.IsNullOrWhiteSpace(m.PrimaryColorHex) ? "#10B5A6" : m.PrimaryColorHex!;
        var title = string.IsNullOrWhiteSpace(m.Title) ? "Executive Security Assessment Report" : m.Title;

        var reportFindings = m.Findings
            .Where(x => x.Severity != Severity.Info)
            .ToList();

        var failed = reportFindings.Where(x => !x.Passed).ToList();
        var passed = reportFindings.Where(x => x.Passed).ToList();
        var highRisk = failed.Count(x => x.Severity is Severity.High or Severity.Critical);
        var totalChecks = reportFindings.Count;

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(36);

                page.Header().Column(header =>
                {
                    header.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(m.BrandName ?? "CyberShield360 By Mujtaba")
                                .FontSize(24)
                                .Bold()
                                .FontColor(color);

                            c.Item().Text(title)
                                .FontSize(13)
                                .FontColor(Colors.Grey.Darken2);
                        });

                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text($"Grade: {m.Grade}")
                                .FontSize(24)
                                .Bold()
                                .FontColor(color);

                            c.Item().Text($"Score: {m.OverallScore}/100")
                                .FontSize(12);
                        });
                    });

                    header.Item().PaddingTop(8).LineHorizontal(1).LineColor(color);
                });

                page.Content().PaddingVertical(14).Column(col =>
                {
                    col.Spacing(10);

                    col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(meta =>
                    {
                        meta.Spacing(4);

                        meta.Item().Text($"Client / Tenant: {m.TenantName}")
                            .FontSize(10);

                        meta.Item().Text($"Asset / Domain: {m.AssetDomain ?? "Unknown Asset"}")
                            .FontSize(10)
                            .Bold();

                        meta.Item().Text($"Scan ID: {m.ScanId ?? "N/A"}")
                            .FontSize(8)
                            .FontColor(Colors.Grey.Darken1);

                        meta.Item().Text($"Scan Type: {m.ScanType ?? "Security Scan"}")
                            .FontSize(8)
                            .FontColor(Colors.Grey.Darken1);

                        meta.Item().Text($"Generated: {m.GeneratedAtUtc:yyyy-MM-dd HH:mm} UTC")
                            .FontSize(8)
                            .FontColor(Colors.Grey.Darken1);

                        meta.Item().Text($"Data Source: {m.DataSource}")
                            .FontSize(8)
                            .FontColor(Colors.Grey.Darken1);

                        meta.Item().Text($"Accuracy Note: {m.AccuracyNote}")
                            .FontSize(8)
                            .Italic()
                            .FontColor(Colors.Grey.Darken1);
                    });

                    col.Item().PaddingTop(8).Text("Executive Summary")
                        .FontSize(16)
                        .Bold()
                        .FontColor(color);

                    col.Item().Text(GetExecutiveSummary(m.OverallScore, failed.Count, highRisk))
                        .FontSize(10);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Overall Score").FontSize(10).FontColor(Colors.Grey.Darken2);
                            c.Item().Text($"{m.OverallScore}/100").FontSize(22).Bold().FontColor(color);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Total Checks").FontSize(10).FontColor(Colors.Grey.Darken2);
                            c.Item().Text(totalChecks.ToString()).FontSize(22).Bold().FontColor(Colors.Blue.Darken1);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Passed Checks").FontSize(10).FontColor(Colors.Grey.Darken2);
                            c.Item().Text(passed.Count.ToString()).FontSize(22).Bold().FontColor(Colors.Green.Darken1);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Failed Checks").FontSize(10).FontColor(Colors.Grey.Darken2);
                            c.Item().Text(failed.Count.ToString()).FontSize(22).Bold().FontColor(Colors.Red.Darken1);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("High/Critical Fail").FontSize(10).FontColor(Colors.Grey.Darken2);
                            c.Item().Text(highRisk.ToString()).FontSize(22).Bold().FontColor(Colors.Orange.Darken2);
                        });
                    });

                    col.Item().PaddingTop(10).Text("Top Recommended Actions")
                        .FontSize(15)
                        .Bold()
                        .FontColor(color);

                    var topActions = failed
                        .Where(x => !string.IsNullOrWhiteSpace(x.Recommendation))
                        .Take(8)
                        .ToList();

                    if (topActions.Any())
                    {
                        foreach (var f in topActions)
                        {
                            col.Item().Text($"• {f.Title}: {f.Recommendation}")
                                .FontSize(9);
                        }
                    }
                    else
                    {
                        col.Item().Text("No urgent remediation actions were identified.")
                            .FontSize(9);
                    }

                    col.Item().PaddingTop(12).Text("Priority Findings Requiring Review")
                        .FontSize(15)
                        .Bold()
                        .FontColor(color);

                    col.Item().Text("Failed checks are shown first to support remediation planning. Passed checks are listed after failed checks.")
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

                        table.Header(h =>
                        {
                            foreach (var head in new[] { "Check", "Severity", "Status", "Recommendation" })
                            {
                                h.Cell()
                                    .Background(color)
                                    .Padding(5)
                                    .Text(head)
                                    .FontColor(Colors.White)
                                    .Bold()
                                    .FontSize(8);
                            }
                        });

                        foreach (var f in reportFindings
                                     .OrderBy(x => x.Passed)
                                     .ThenByDescending(x => x.Severity)
                                     .ThenBy(x => x.Title))
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5)
                                .Text(f.Title).FontSize(8);

                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5)
                                .Text(f.Severity.ToString()).FontSize(8);

                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5)
                                .Text(f.Passed ? "PASS" : "FAIL")
                                .FontSize(8)
                                .Bold()
                                .FontColor(f.Passed ? Colors.Green.Darken1 : Colors.Red.Darken1);

                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5)
                                .Text(f.Passed ? "-" : (f.Recommendation ?? "-"))
                                .FontSize(8);
                        }
                    });
                });

                page.Footer().Row(row =>
                {
                    row.RelativeItem()
                        .Text(m.FooterText ?? "Confidential Security Report - CyberShield360")
                        .FontSize(8)
                        .FontColor(Colors.Grey.Medium);

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

        return Task.FromResult(doc.GeneratePdf());
    }

    public Task<byte[]> GenerateExcelAsync(ReportModel m, CancellationToken ct = default)
    {
        var color = string.IsNullOrWhiteSpace(m.PrimaryColorHex) ? "#10B5A6" : m.PrimaryColorHex!;
        var title = string.IsNullOrWhiteSpace(m.Title) ? "Executive Security Assessment Report" : m.Title;

        var reportFindings = m.Findings
            .Where(x => x.Severity != Severity.Info)
            .ToList();

        var failed = reportFindings.Where(x => !x.Passed).ToList();
        var passed = reportFindings.Where(x => x.Passed).ToList();
        var highRisk = failed.Count(x => x.Severity is Severity.High or Severity.Critical);
        var totalChecks = reportFindings.Count;

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Security Report");

        ws.Cell(1, 1).Value = m.BrandName ?? "CyberShield360 By Mujtaba";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 18;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml(color);

        ws.Cell(2, 1).Value = title;
        ws.Cell(2, 1).Style.Font.Bold = true;

        ws.Cell(4, 1).Value = "Tenant";
        ws.Cell(4, 2).Value = m.TenantName;

        ws.Cell(5, 1).Value = "Asset / Domain";
        ws.Cell(5, 2).Value = m.AssetDomain ?? "Unknown Asset";

        ws.Cell(6, 1).Value = "Scan ID";
        ws.Cell(6, 2).Value = m.ScanId ?? "N/A";

        ws.Cell(7, 1).Value = "Scan Type";
        ws.Cell(7, 2).Value = m.ScanType ?? "Security Scan";

        ws.Cell(8, 1).Value = "Generated UTC";
        ws.Cell(8, 2).Value = $"{m.GeneratedAtUtc:yyyy-MM-dd HH:mm} UTC";

        ws.Cell(9, 1).Value = "Data Source";
        ws.Cell(9, 2).Value = m.DataSource;

        ws.Cell(10, 1).Value = "Accuracy Note";
        ws.Cell(10, 2).Value = m.AccuracyNote;

        ws.Cell(12, 1).Value = "Overall Score";
        ws.Cell(12, 2).Value = $"{m.OverallScore}/100";

        ws.Cell(13, 1).Value = "Grade";
        ws.Cell(13, 2).Value = m.Grade;

        ws.Cell(14, 1).Value = "Total Checks";
        ws.Cell(14, 2).Value = totalChecks;

        ws.Cell(15, 1).Value = "Passed Checks";
        ws.Cell(15, 2).Value = passed.Count;

        ws.Cell(16, 1).Value = "Failed Checks";
        ws.Cell(16, 2).Value = failed.Count;

        ws.Cell(17, 1).Value = "High/Critical Fail";
        ws.Cell(17, 2).Value = highRisk;

        ws.Range("A4:A17").Style.Font.Bold = true;

        var r = 20;

        foreach (var (head, i) in new[] { "Check", "Severity", "Status", "Detail", "Recommendation" }
                     .Select((h, i) => (h, i + 1)))
        {
            ws.Cell(r, i).Value = head;
            ws.Cell(r, i).Style.Font.Bold = true;
            ws.Cell(r, i).Style.Fill.BackgroundColor = XLColor.FromHtml(color);
            ws.Cell(r, i).Style.Font.FontColor = XLColor.White;
        }

        foreach (var f in reportFindings
                     .OrderBy(x => x.Passed)
                     .ThenByDescending(x => x.Severity)
                     .ThenBy(x => x.Title))
        {
            r++;

            ws.Cell(r, 1).Value = f.Title;
            ws.Cell(r, 2).Value = f.Severity.ToString();
            ws.Cell(r, 3).Value = f.Passed ? "PASS" : "FAIL";
            ws.Cell(r, 4).Value = f.Detail ?? "";
            ws.Cell(r, 5).Value = f.Passed ? "-" : (f.Recommendation ?? "");

            ws.Cell(r, 3).Style.Font.FontColor = f.Passed
                ? XLColor.Green
                : XLColor.Red;
        }

        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(20);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return Task.FromResult(ms.ToArray());
    }

    private static string GetExecutiveSummary(int score, int failedCount, int highRiskCount)
    {
        if (score >= 85)
            return $"The organization demonstrates a strong security posture. {failedCount} scanner rule failures were identified, with {highRiskCount} high/critical items requiring review.";

        if (score >= 70)
            return $"The organization has a moderate security posture. {failedCount} scanner rule failures were identified. Remediation should focus on high-impact issues first.";

        if (score >= 50)
            return $"The organization has elevated security risk. {failedCount} scanner rule failures were identified, including {highRiskCount} high/critical issues. Prompt remediation review is recommended.";

        return $"The organization has a weak security posture. {failedCount} scanner rule failures were identified, including {highRiskCount} high/critical issues. Immediate remediation review is strongly recommended.";
    }
}