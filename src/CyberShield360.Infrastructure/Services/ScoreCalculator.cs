using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Infrastructure.Services;

public class ScoreCalculator : IScoreCalculator
{
    private static readonly Dictionary<Severity, int> Penalty = new()
    {
        [Severity.Info] = 0,
        [Severity.Low] = 1,
        [Severity.Medium] = 3,
        [Severity.High] = 6,
        [Severity.Critical] = 15
    };

    public (int score, SecurityGrade grade) Calculate(IEnumerable<FindingDto> findings)
    {
        var score = 100;

        foreach (var f in findings.Where(x => !x.Passed))
            score -= Penalty.GetValueOrDefault(f.Severity, 3);

        score = Math.Clamp(score, 0, 100);

        return (score, GradeFromScore(score));
    }

    public SecurityGrade GradeFromScore(int score) => score switch
    {
        >= 95 => SecurityGrade.A,
        >= 85 => SecurityGrade.B,
        >= 75 => SecurityGrade.C,
        >= 60 => SecurityGrade.D,
        _ => SecurityGrade.F
    };
}