using CyberShield360.Domain.Enums;
namespace CyberShield360.Application.Features.Training.Dtos;

public record CourseDto(Guid Id, string Title, string? Description, int DurationMinutes, bool IsPublished);
public record EnrollmentDto(Guid Id, Guid CourseId, string CourseTitle, TrainingStatus Status,
    int ProgressPercent, int? QuizScore, DateTime? DueDateUtc);
public record ComplianceDto(int TotalEnrollments, int Completed, int Overdue, int CompletionPercent);
