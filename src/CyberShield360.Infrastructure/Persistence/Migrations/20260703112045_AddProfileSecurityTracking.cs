using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyberShield360.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileSecurityTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordLastChangedUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AiRemediationGuidance",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Score = table.Column<int>(type: "int", nullable: false),
                    Grade = table.Column<int>(type: "int", nullable: false),
                    FailedFindings = table.Column<int>(type: "int", nullable: false),
                    HighCriticalFindings = table.Column<int>(type: "int", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExecutiveSummary = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BusinessImpact = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrioritizedActionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VerificationStepsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RawModelJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiRemediationGuidance", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiRemediationGuidance_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AiRemediationGuidance_Scans_ScanId",
                        column: x => x.ScanId,
                        principalTable: "Scans",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiRemediationGuidance_AssetId",
                table: "AiRemediationGuidance",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRemediationGuidance_ScanId",
                table: "AiRemediationGuidance",
                column: "ScanId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRemediationGuidance_TenantId",
                table: "AiRemediationGuidance",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiRemediationGuidance");

            migrationBuilder.DropColumn(
                name: "PasswordLastChangedUtc",
                table: "AspNetUsers");
        }
    }
}
