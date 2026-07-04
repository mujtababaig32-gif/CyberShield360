using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyberShield360.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAiRemediationWorkflowSafe : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AiRemediationGuidance] (
        [Id] uniqueidentifier NOT NULL,
        [ScanId] uniqueidentifier NOT NULL,
        [AssetId] uniqueidentifier NOT NULL,
        [Domain] nvarchar(max) NOT NULL,
        [Score] int NOT NULL,
        [Grade] int NOT NULL,
        [FailedFindings] int NOT NULL,
        [HighCriticalFindings] int NOT NULL,
        [Provider] nvarchar(max) NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [ExecutiveSummary] nvarchar(max) NOT NULL,
        [BusinessImpact] nvarchar(max) NOT NULL,
        [PrioritizedActionsJson] nvarchar(max) NOT NULL,
        [VerificationStepsJson] nvarchar(max) NOT NULL,
        [RawModelJson] nvarchar(max) NULL,
        [GeneratedUtc] datetime2 NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [UpdatedAtUtc] datetime2 NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_AiRemediationGuidance] PRIMARY KEY ([Id])
    );
END

IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AiRemediationGuidance_AssetId' AND object_id = OBJECT_ID(N'[dbo].[AiRemediationGuidance]'))
BEGIN
    CREATE INDEX [IX_AiRemediationGuidance_AssetId] ON [dbo].[AiRemediationGuidance] ([AssetId]);
END

IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AiRemediationGuidance_ScanId' AND object_id = OBJECT_ID(N'[dbo].[AiRemediationGuidance]'))
BEGIN
    CREATE INDEX [IX_AiRemediationGuidance_ScanId] ON [dbo].[AiRemediationGuidance] ([ScanId]);
END

IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AiRemediationGuidance_TenantId' AND object_id = OBJECT_ID(N'[dbo].[AiRemediationGuidance]'))
BEGIN
    CREATE INDEX [IX_AiRemediationGuidance_TenantId] ON [dbo].[AiRemediationGuidance] ([TenantId]);
END

IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[Assets]', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AiRemediationGuidance_Assets_AssetId')
BEGIN
    ALTER TABLE [dbo].[AiRemediationGuidance] WITH CHECK ADD CONSTRAINT [FK_AiRemediationGuidance_Assets_AssetId]
    FOREIGN KEY([AssetId]) REFERENCES [dbo].[Assets] ([Id]) ON DELETE NO ACTION;
END

IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[Scans]', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AiRemediationGuidance_Scans_ScanId')
BEGIN
    ALTER TABLE [dbo].[AiRemediationGuidance] WITH CHECK ADD CONSTRAINT [FK_AiRemediationGuidance_Scans_ScanId]
    FOREIGN KEY([ScanId]) REFERENCES [dbo].[Scans] ([Id]) ON DELETE NO ACTION;
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[AiRemediationGuidance]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[AiRemediationGuidance];
END
");
        }
    }
}
