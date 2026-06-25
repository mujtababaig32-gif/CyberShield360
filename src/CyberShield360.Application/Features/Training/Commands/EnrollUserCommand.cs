using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Training.Commands;

public record EnrollUserCommand(Guid CourseId, Guid UserId, DateTime? DueDateUtc) : IRequest<Result<Guid>>;

public class EnrollUserHandler : IRequestHandler<EnrollUserCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _user;
    public EnrollUserHandler(IApplicationDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Result<Guid>> Handle(EnrollUserCommand r, CancellationToken ct)
    {
        if (_user.TenantId is null) return Result<Guid>.Failure("No tenant context.");
        var exists = await _db.TrainingEnrollments
            .AnyAsync(e => e.CourseId == r.CourseId && e.UserId == r.UserId, ct);
        if (exists) return Result<Guid>.Failure("User already enrolled.");

        var enrollment = new TrainingEnrollment
        {
            TenantId = _user.TenantId.Value, CourseId = r.CourseId, UserId = r.UserId,
            Status = TrainingStatus.NotStarted, DueDateUtc = r.DueDateUtc
        };
        _db.TrainingEnrollments.Add(enrollment);
        await _db.SaveChangesAsync(ct);
        return Result<Guid>.Success(enrollment.Id);
    }
}
