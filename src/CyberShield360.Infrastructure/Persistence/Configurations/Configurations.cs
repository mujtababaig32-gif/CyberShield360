using CyberShield360.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyberShield360.Infrastructure.Persistence.Configurations;

public class TenantConfig : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> b)
    {
        b.Property(x => x.Name).IsRequired().HasMaxLength(256);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(128);
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasOne(x => x.Subscription).WithOne().HasForeignKey<Subscription>(s => s.TenantId);
    }
}

public class AssetConfig : IEntityTypeConfiguration<MonitoredAsset>
{
    public void Configure(EntityTypeBuilder<MonitoredAsset> b)
    {
        b.Property(x => x.Domain).IsRequired().HasMaxLength(256);
        b.HasIndex(x => new { x.TenantId, x.Domain }).IsUnique();
        b.HasMany(x => x.Scans).WithOne(s => s.Asset!).HasForeignKey(s => s.AssetId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ScanConfig : IEntityTypeConfiguration<SecurityScan>
{
    public void Configure(EntityTypeBuilder<SecurityScan> b)
    {
        b.HasMany(x => x.Findings).WithOne(f => f.Scan!).HasForeignKey(f => f.ScanId)
            .OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.TenantId, x.AssetId, x.CreatedAtUtc });
    }
}

public class VulnerabilityConfig : IEntityTypeConfiguration<Vulnerability>
{
    public void Configure(EntityTypeBuilder<Vulnerability> b)
    {
        b.Property(x => x.Title).IsRequired().HasMaxLength(256);
        b.HasMany(x => x.Steps).WithOne().HasForeignKey(s => s.VulnerabilityId)
            .OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.TenantId, x.Status, x.Severity });
    }
}

public class ApiKeyConfig : IEntityTypeConfiguration<ApiKey>
{
    public void Configure(EntityTypeBuilder<ApiKey> b)
    {
        b.HasIndex(x => x.KeyHash).IsUnique();
        b.Property(x => x.KeyHash).IsRequired();
    }
}

public class AuditLogConfig : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.HasIndex(x => new { x.TenantId, x.CreatedAtUtc });
        b.Property(x => x.EntityType).HasMaxLength(128);
    }
}
