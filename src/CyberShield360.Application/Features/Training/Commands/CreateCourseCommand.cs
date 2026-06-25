using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CyberShield360.Application.Features.Training.Commands;

public record CreateCourseCommand(string Title, string? Description, int DurationMinutes, bool Publish)
    : IRequest<Result<Guid>>;

public class CreateCourseValidator : AbstractValidator<CreateCourseCommand>
{
    public CreateCourseValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
        RuleFor(x => x.DurationMinutes).GreaterThan(0);
    }
}

public class CreateCourseHandler : IRequestHandler<CreateCourseCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _user;
    public CreateCourseHandler(IApplicationDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Result<Guid>> Handle(CreateCourseCommand r, CancellationToken ct)
    {
        if (_user.TenantId is null) return Result<Guid>.Failure("No tenant context.");
        var course = new TrainingCourse
        {
            TenantId = _user.TenantId.Value, Title = r.Title, Description = r.Description,
            DurationMinutes = r.DurationMinutes, IsPublished = r.Publish
        };
        _db.TrainingCourses.Add(course);
        await _db.SaveChangesAsync(ct);
        return Result<Guid>.Success(course.Id);
    }
}
