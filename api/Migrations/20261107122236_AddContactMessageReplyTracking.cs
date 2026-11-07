using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Albaik.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContactMessageReplyTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RepliedAt",
                table: "ContactMessages",
                type: "datetime(6)",
                precision: 6,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReplyCount",
                table: "ContactMessages",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RepliedAt",
                table: "ContactMessages");

            migrationBuilder.DropColumn(
                name: "ReplyCount",
                table: "ContactMessages");
        }
    }
}
