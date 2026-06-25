using CyberShield360.Application.Features.Training.Commands;
using CyberShield360.Application.Features.Training.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class TrainingController : ApiControllerBase
{
    [HttpGet("enrollments")]
    public async Task<IActionResult> MyEnrollments() => Ok(await Mediator.Send(new GetMyEnrollmentsQuery()));

    [HttpGet("compliance")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst,Auditor")]
    public async Task<IActionResult> Compliance() => Ok(await Mediator.Send(new GetTrainingComplianceQuery()));

    [HttpPost("courses")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> CreateCourse(CreateCourseCommand command) => Ok(await Mediator.Send(command));

    [HttpPost("enroll")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Enroll(EnrollUserCommand command) => Ok(await Mediator.Send(command));

    [HttpPut("enrollments/{id:guid}/progress")]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody] ProgressBody body)
        => Ok(await Mediator.Send(new UpdateProgressCommand(id, body.ProgressPercent, body.QuizScore)));
}

public record ProgressBody(int ProgressPercent, int? QuizScore);
