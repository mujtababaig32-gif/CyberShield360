using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Services;
using FluentAssertions;
using Xunit;

namespace CyberShield360.UnitTests;

public class ScoreCalculatorTests
{
    private readonly ScoreCalculator _sut = new();

    [Fact]
    public void AllPassing_Returns100_GradeA()
    {
        var findings = new[]
        {
            new FindingDto("a", "A", Severity.High, true, null, null),
            new FindingDto("b", "B", Severity.Critical, true, null, null)
        };
        var (score, grade) = _sut.Calculate(findings);
        score.Should().Be(100);
        grade.Should().Be(SecurityGrade.A);
    }

    [Theory]
    [InlineData(95, SecurityGrade.A)]
    [InlineData(85, SecurityGrade.B)]
    [InlineData(72, SecurityGrade.C)]
    [InlineData(61, SecurityGrade.D)]
    [InlineData(40, SecurityGrade.F)]
    public void GradeFromScore_MapsCorrectly(int score, SecurityGrade expected)
        => _sut.GradeFromScore(score).Should().Be(expected);

    [Fact]
    public void CriticalFailure_AppliesLargestPenalty()
    {
        var findings = new[] { new FindingDto("x", "X", Severity.Critical, false, null, null) };
        var (score, _) = _sut.Calculate(findings);
        score.Should().Be(70); // 100 - 30
    }
}
