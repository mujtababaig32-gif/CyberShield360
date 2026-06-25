using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using FluentAssertions;
using Xunit;

namespace CyberShield360.UnitTests;

public class RiskScoringTests
{
    [Fact]
    public void InherentScore_IsLikelihoodTimesImpact()
    {
        var risk = new Risk { Likelihood = RiskLikelihood.Likely, Impact = RiskImpact.Major };
        risk.InherentScore.Should().Be(16); // 4 * 4
    }
}
