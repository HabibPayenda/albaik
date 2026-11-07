using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Albaik.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContactMessageReplyMessageId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MessageId",
                table: "ContactMessageReplies",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ContactMessageReplies_MessageId",
                table: "ContactMessageReplies",
                column: "MessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ContactMessageReplies_MessageId",
                table: "ContactMessageReplies");

            migrationBuilder.DropColumn(
                name: "MessageId",
                table: "ContactMessageReplies");
        }
    }
}
