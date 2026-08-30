using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyberShield360.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhishingTargetCampaignNav : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Before this migration, EF tracked PhishingCampaign->PhishingTarget via a
            // shadow "PhishingCampaignId" column instead of the visible CampaignId
            // property (which nothing ever set, so it was always empty). Copy the real
            // association across before dropping the shadow column, so any campaign/
            // target data created before this fix isn't silently orphaned.
            migrationBuilder.Sql(
                "UPDATE PhishingTargets SET CampaignId = PhishingCampaignId WHERE PhishingCampaignId IS NOT NULL;");

            migrationBuilder.DropForeignKey(
                name: "FK_PhishingTargets_PhishingCampaigns_PhishingCampaignId",
                table: "PhishingTargets");

            migrationBuilder.DropIndex(
                name: "IX_PhishingTargets_PhishingCampaignId",
                table: "PhishingTargets");

            migrationBuilder.DropColumn(
                name: "PhishingCampaignId",
                table: "PhishingTargets");

            migrationBuilder.CreateIndex(
                name: "IX_PhishingTargets_CampaignId",
                table: "PhishingTargets",
                column: "CampaignId");

            migrationBuilder.AddForeignKey(
                name: "FK_PhishingTargets_PhishingCampaigns_CampaignId",
                table: "PhishingTargets",
                column: "CampaignId",
                principalTable: "PhishingCampaigns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PhishingTargets_PhishingCampaigns_CampaignId",
                table: "PhishingTargets");

            migrationBuilder.DropIndex(
                name: "IX_PhishingTargets_CampaignId",
                table: "PhishingTargets");

            migrationBuilder.AddColumn<Guid>(
                name: "PhishingCampaignId",
                table: "PhishingTargets",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PhishingTargets_PhishingCampaignId",
                table: "PhishingTargets",
                column: "PhishingCampaignId");

            migrationBuilder.AddForeignKey(
                name: "FK_PhishingTargets_PhishingCampaigns_PhishingCampaignId",
                table: "PhishingTargets",
                column: "PhishingCampaignId",
                principalTable: "PhishingCampaigns",
                principalColumn: "Id");
        }
    }
}
