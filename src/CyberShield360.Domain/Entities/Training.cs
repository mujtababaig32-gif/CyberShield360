using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class TrainingCourse : AuditableTenantEntity
{
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public string? ContentUrl { get; set; }
    public bool IsPublished { get; set; }
    public ICollection<TrainingModule> Modules { get; set; } = new List<TrainingModule>();
}

public class TrainingModule : AuditableTenantEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = default!;
    public int Order { get; set; }
    public string? ContentMarkdown { get; set; }
    public int QuizPassPercent { get; set; } = 80;
}

public class TrainingEnrollment : AuditableTenantEntity
{
    public Guid CourseId { get; set; }
    public Guid UserId { get; set; }
    public TrainingStatus Status { get; set; } = TrainingStatus.NotStarted;
    public int ProgressPercent { get; set; }
    public int? QuizScore { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
}
