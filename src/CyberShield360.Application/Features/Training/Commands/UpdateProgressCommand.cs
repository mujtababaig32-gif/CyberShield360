using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Training.Commands;

public record UpdateProgressCommand(Guid EnrollmentId, int ProgressPercent, int? QuizScore)
    : IRequest<Result>;

public class UpdateProgressHandler : IRequestHandler<UpdateProgressCommand, Result>
{
    private readonly IApplicationDbContext _db;
    public UpdateProgressHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result> Handle(UpdateProgressCommand r, CancellationToken ct)
    {
        var e = await _db.TrainingEnrollments.FirstOrDefaultAsync(x => x.Id == r.EnrollmentId, ct);
        if (e is null) return Result.Failure("Enrollment not found.");
        e.ProgressPercent = Math.Clamp(r.ProgressPercent, 0, 100);
        e.QuizScore = r.QuizScore ?? e.QuizScore;
        e.Status = e.ProgressPercent >= 100 ? TrainingStatus.Completed
            : e.ProgressPercent > 0 ? TrainingStatus.InProgress : TrainingStatus.NotStarted;
        if (e.Status == TrainingStatus.Completed) e.CompletedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
