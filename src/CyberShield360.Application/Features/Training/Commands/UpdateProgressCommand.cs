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
    private readonly ICurrentUser _currentUser;

    public UpdateProgressHandler(IApplicationDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(UpdateProgressCommand r, CancellationToken ct)
    {
        var e = await _db.TrainingEnrollments.FirstOrDefaultAsync(x => x.Id == r.EnrollmentId, ct);
        if (e is null) return Result.Failure("Enrollment not found.");

        // The tenant filter alone only proves this enrollment belongs to the caller's
        // tenant, not that it belongs to the caller — without this, any authenticated
        // coworker could falsify someone else's training completion by guessing an ID.
        if (e.UserId != _currentUser.UserId)
            return Result.Failure("You do not have permission to update this enrollment.");

        e.ProgressPercent = Math.Clamp(r.ProgressPercent, 0, 100);
        e.QuizScore = r.QuizScore ?? e.QuizScore;
        e.Status = e.ProgressPercent >= 100 ? TrainingStatus.Completed
            : e.ProgressPercent > 0 ? TrainingStatus.InProgress : TrainingStatus.NotStarted;
        if (e.Status == TrainingStatus.Completed) e.CompletedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
