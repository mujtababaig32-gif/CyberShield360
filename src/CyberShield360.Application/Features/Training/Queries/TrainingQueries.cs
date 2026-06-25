using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Training.Dtos;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Training.Queries;

public record GetMyEnrollmentsQuery() : IRequest<IReadOnlyList<EnrollmentDto>>;

public class GetMyEnrollmentsHandler : IRequestHandler<GetMyEnrollmentsQuery, IReadOnlyList<EnrollmentDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _user;
    public GetMyEnrollmentsHandler(IApplicationDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<IReadOnlyList<EnrollmentDto>> Handle(GetMyEnrollmentsQuery request, CancellationToken ct)
    {
        var uid = _user.UserId ?? Guid.Empty;
        return await _db.TrainingEnrollments.AsNoTracking()
            .Where(e => e.UserId == uid)
            .Join(_db.TrainingCourses, e => e.CourseId, c => c.Id, (e, c) => new EnrollmentDto(
                e.Id, e.CourseId, c.Title, e.Status, e.ProgressPercent, e.QuizScore, e.DueDateUtc))
            .ToListAsync(ct);
    }
}

public record GetTrainingComplianceQuery() : IRequest<ComplianceDto>;

public class GetTrainingComplianceHandler : IRequestHandler<GetTrainingComplianceQuery, ComplianceDto>
{
    private readonly IApplicationDbContext _db;
    public GetTrainingComplianceHandler(IApplicationDbContext db) => _db = db;

    public async Task<ComplianceDto> Handle(GetTrainingComplianceQuery request, CancellationToken ct)
    {
        var total = await _db.TrainingEnrollments.CountAsync(ct);
        var completed = await _db.TrainingEnrollments.CountAsync(e => e.Status == TrainingStatus.Completed, ct);
        var overdue = await _db.TrainingEnrollments.CountAsync(
            e => e.Status != TrainingStatus.Completed && e.DueDateUtc != null && e.DueDateUtc < DateTime.UtcNow, ct);
        var pct = total > 0 ? completed * 100 / total : 0;
        return new ComplianceDto(total, completed, overdue, pct);
    }
}
