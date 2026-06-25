using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class SecurityAwarenessController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public SecurityAwarenessController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid && u.IsActive)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FullName,
                u.JobTitle,
                u.LastLoginUtc
            })
            .ToListAsync(ct);

        var courses = await _db.TrainingCourses
            .AsNoTracking()
            .Where(c => c.TenantId == tid)
            .OrderBy(c => c.Title)
            .ToListAsync(ct);

        var enrollments = await _db.TrainingEnrollments
            .AsNoTracking()
            .Where(e => e.TenantId == tid)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;

        var learners = users.Select(u =>
        {
            var userEnrollments = enrollments
                .Where(e => e.UserId == u.Id)
                .ToList();

            var assigned = userEnrollments.Count;
            var completed = userEnrollments.Count(e => e.Status == TrainingStatus.Completed);
            var avgProgress = assigned == 0
                ? 0
                : (int)Math.Round(userEnrollments.Average(e => e.ProgressPercent));
            var avgQuiz = userEnrollments.Any(e => e.QuizScore.HasValue)
                ? (int)Math.Round(userEnrollments.Where(e => e.QuizScore.HasValue).Average(e => e.QuizScore!.Value))
                : 0;
            var overdue = userEnrollments.Count(e =>
                e.Status != TrainingStatus.Completed &&
                e.DueDateUtc.HasValue &&
                e.DueDateUtc.Value < now);
            var lastTraining = userEnrollments
                .Where(e => e.CompletedAtUtc.HasValue)
                .OrderByDescending(e => e.CompletedAtUtc)
                .Select(e => e.CompletedAtUtc)
                .FirstOrDefault();

            var risk = assigned == 0
                ? "Unassigned"
                : overdue > 0 || avgQuiz < 60
                    ? "High"
                    : avgProgress < 70 || avgQuiz < 75
                        ? "Medium"
                        : "Low";

            var status = assigned == 0
                ? "No Training Assigned"
                : completed == assigned
                    ? "Completed"
                    : overdue > 0
                        ? "Overdue"
                        : "In Progress";

            return new
            {
                userId = u.Id,
                name = string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName,
                email = u.Email,
                department = string.IsNullOrWhiteSpace(u.JobTitle) ? "Unassigned" : u.JobTitle,
                assignedCourses = assigned,
                completedCourses = completed,
                completionPercent = avgProgress,
                quizScore = avgQuiz,
                overdueCourses = overdue,
                riskLevel = risk,
                status,
                lastTrainingUtc = lastTraining,
                recommendedAction = assigned == 0
                    ? "Assign baseline security awareness training."
                    : overdue > 0
                        ? "Follow up on overdue training and set a completion deadline."
                        : avgQuiz < 75
                            ? "Assign refresher training and re-test security awareness."
                            : "Continue the standard awareness cycle."
            };
        }).ToList();

        var courseCards = courses.Select(c =>
        {
            var courseEnrollments = enrollments.Where(e => e.CourseId == c.Id).ToList();
            var completionRate = courseEnrollments.Count == 0
                ? 0
                : (int)Math.Round(courseEnrollments.Count(e => e.Status == TrainingStatus.Completed) * 100.0 / courseEnrollments.Count);

            return new
            {
                id = c.Id,
                title = c.Title,
                category = string.IsNullOrWhiteSpace(c.Description) ? "Security Awareness" : c.Description,
                durationMinutes = c.DurationMinutes,
                difficulty = c.DurationMinutes <= 20 ? "Beginner" : c.DurationMinutes <= 40 ? "Intermediate" : "Advanced",
                completionRate,
                assignedLearners = courseEnrollments.Count,
                status = c.IsPublished ? "Published" : "Draft"
            };
        }).ToList();

        var campaigns = new List<object>();

        if (courseCards.Any())
        {
            campaigns.Add(new
            {
                name = "Current Awareness Program",
                audience = "Assigned Learners",
                status = "Measured From Enrollments",
                completionRate = learners.Any() ? (int)Math.Round(learners.Average(x => x.completionPercent)) : 0,
                dueDateUtc = enrollments
                    .Where(e => e.DueDateUtc.HasValue)
                    .OrderBy(e => e.DueDateUtc)
                    .Select(e => e.DueDateUtc)
                    .FirstOrDefault()
            });
        }

        var recommendations = new List<string>();

        if (!courses.Any())
            recommendations.Add("Create and publish baseline awareness training courses.");
        if (learners.Any(x => x.assignedCourses == 0))
            recommendations.Add("Assign awareness training to users with no current enrollment.");
        if (learners.Any(x => x.overdueCourses > 0))
            recommendations.Add("Follow up with users who have overdue training assignments.");
        if (learners.Any(x => x.quizScore > 0 && x.quizScore < 75))
            recommendations.Add("Assign refresher content to users with low quiz scores.");
        if (!recommendations.Any())
            recommendations.Add("Awareness program is configured. Continue monitoring completion and quiz performance.");

        return Ok(new
        {
            generatedUtc = now,
            totalLearners = learners.Count,
            averageCompletion = learners.Any() ? (int)Math.Round(learners.Average(x => x.completionPercent)) : 0,
            averageQuizScore = learners.Any(x => x.quizScore > 0)
                ? (int)Math.Round(learners.Where(x => x.quizScore > 0).Average(x => x.quizScore))
                : 0,
            highRiskUsers = learners.Count(x => x.riskLevel == "High"),
            inProgressUsers = learners.Count(x => x.status == "In Progress"),
            completedUsers = learners.Count(x => x.status == "Completed"),
            unassignedUsers = learners.Count(x => x.assignedCourses == 0),
            courses = courseCards,
            campaigns,
            learners,
            recommendations
        });
    }
}
