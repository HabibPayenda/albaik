using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Albaik.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductMetaDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MetaDescription",
                table: "Products",
                type: "varchar(320)",
                maxLength: 320,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MetaDescription",
                table: "Products");
        }
    }
}
