using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Albaik.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerReplyTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CustomerReplyCount",
                table: "ContactMessages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastCustomerReplyAt",
                table: "ContactMessages",
                type: "datetime(6)",
                precision: 6,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerReplyCount",
                table: "ContactMessages");

            migrationBuilder.DropColumn(
                name: "LastCustomerReplyAt",
                table: "ContactMessages");
        }
    }
}
