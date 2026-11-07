using Microsoft.Data.Sqlite;

namespace Albaik.Api.Tests;

internal sealed record SqliteImportFixture(
    string DatabasePath,
    string AdminPasswordHash,
    string VerificationCode,
    IReadOnlyDictionary<string, int> RowCounts);

/// <summary>
/// Builds a small SQLite database with the same shape as the live file: the same table
/// and column names, explicit Ids that are not a 1..n sequence, seven columns of JSON,
/// Dari text, nullable values and six-digit timestamps. The importer must preserve all
/// of it, so this fixture is deliberately written by hand instead of generated from the
/// importer's own model.
/// </summary>
internal static class SqliteImportFixtureBuilder
{
    public const string AdminPassword = "Fixture@123";
    public const string VerificationCode = "GGK69TAE7FPN96ZR";

    public static SqliteImportFixture Create(string directory, bool omitProductMetaDescription = false)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, "albaik-fixture.db");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword);

        using var connection = new SqliteConnection($"Data Source={path};Pooling=False");
        connection.Open();

        Execute(connection, omitProductMetaDescription
            ? SchemaWithoutProductMetaDescription()
            : Schema);

        // -------------------------------------------------------------- Categories
        Insert(connection, "Categories",
            ("Id", 41), ("Slug", "hair-care"), ("Name", "Hair Care"),
            ("NameDari", "مراقبت از مو"), ("NamePashto", "د وېښتانو پاملرنه"),
            ("Tagline", "Shampoo collections"), ("Description", "Dari description: مراقبت"),
            ("ImageUrl", null), ("Icon", "spa"), ("Accent", "primary"),
            ("SortOrder", 1), ("IsActive", 1), ("ShowInNav", 1),
            ("CreatedAt", "2026-09-26 06:47:31.413038"),
            ("UpdatedAt", "2026-09-26 06:47:31.413039"));

        Insert(connection, "Categories",
            ("Id", 42), ("Slug", "skin-care"), ("Name", "Skin Care"),
            ("NameDari", "مراقبت از پوست"), ("NamePashto", null),
            ("Tagline", null), ("Description", null), ("ImageUrl", null),
            ("Icon", "face"), ("Accent", "secondary"),
            ("SortOrder", 2), ("IsActive", 1), ("ShowInNav", 0),
            ("CreatedAt", "2026-09-26 07:00:00.000001"),
            ("UpdatedAt", "2026-09-26 07:00:00.000002"));

        // ------------------------------------------------------------------ Brands
        Insert(connection, "Brands",
            ("Id", 71), ("Slug", "albaik"), ("Name", "Albaik"),
            ("Tagline", "The Mark of Pure Perfection"), ("Description", "Brand description"),
            ("LogoUrl", null), ("ImageUrl", null), ("Accent", "primary"),
            ("CategoryId", 41), ("SortOrder", 1), ("IsActive", 1), ("IsFeatured", 1),
            ("CreatedAt", "2026-09-26 06:48:00.123456"),
            ("UpdatedAt", "2026-09-26 06:48:00.123457"));

        Insert(connection, "Brands",
            ("Id", 72), ("Slug", "avora-shine"), ("Name", "Avora Shine"),
            ("Tagline", null), ("Description", null), ("LogoUrl", null),
            ("ImageUrl", "/brands/avora.png"), ("Accent", "secondary"),
            ("CategoryId", 41), ("SortOrder", 2), ("IsActive", 1), ("IsFeatured", 0),
            ("CreatedAt", "2026-09-26 06:49:00.000001"),
            ("UpdatedAt", "2026-09-26 06:49:00.000001"));

        // ---------------------------------------------------------------- Products
        var firstProductColumns = new List<(string Column, object? Value)>
        {
            ("Id", 101), ("Slug", "albaik-anti-dandruff-shampoo"),
            ("Name", "Albaik Anti-Dandruff Shampoo"),
            ("Subtitle", "For dandruff-related scalp and hair care"),
            ("FormulationLabel", "Aqua Soothing Complex"),
            ("ShortDescription", "Short description"), ("Description", "Long description"),
            ("CategoryId", 41), ("BrandId", 71), ("Size", "400 ML"),
            ("Price", "123.45"), ("CompareAtPrice", "150.00"), ("Currency", "AFN"),
            ("PriceNote", "Price on request"), ("Rating", 4.5), ("ReviewCount", 7),
            ("Badge", "Flakes Cleansing"), ("BadgeStyle", "teal"), ("StockStatus", "InStock"),
            ("ImageUrl", "/products/p1.webp"), ("AccentFrom", "#003337"), ("AccentTo", "#008891"),
            ("Benefits", """["Helps reduce dandruff","Cleanses the scalp"]"""),
            ("Ingredients", """["Anti-Dandruff","Scalp Care"]"""),
            ("HowToUse", "Wet hair thoroughly."),
            ("SafetyNote", "For external use only."),
            ("SuitableFor", "All hair types"),
            ("IsFeatured", 1), ("IsActive", 1), ("SortOrder", 1),
            ("CreatedAt", "2026-09-26 06:47:31.713292"),
            ("UpdatedAt", "2026-10-31 13:53:41.161137"),
            ("Ibn", "6291104123456"),
            ("VerificationCode", VerificationCode),
        };

        // An old live database predates Products.MetaDescription. The importer must read
        // that copy too, leaving the missing nullable column null.
        if (!omitProductMetaDescription)
            firstProductColumns.Add(("MetaDescription", "Imported search snippet"));

        Insert(connection, "Products", firstProductColumns.ToArray());

        Insert(connection, "Products",
            ("Id", 102), ("Slug", "avora-shine-coconut-shampoo"),
            ("Name", "Avora Shine Coconut Shampoo"),
            ("Subtitle", null), ("FormulationLabel", "Coconut Care"),
            ("ShortDescription", "For dry and frizzy hair"), ("Description", null),
            ("CategoryId", 41), ("BrandId", 72), ("Size", null),
            ("Price", null), ("CompareAtPrice", null), ("Currency", "AFN"),
            ("PriceNote", null), ("Rating", null), ("ReviewCount", 0),
            ("Badge", null), ("BadgeStyle", null), ("StockStatus", "InStock"),
            ("ImageUrl", null), ("AccentFrom", null), ("AccentTo", null),
            ("Benefits", """["Daily cleansing and hair care","Moisture support"]"""),
            ("Ingredients", """["Coconut","Daily Care"]"""),
            ("HowToUse", null), ("SafetyNote", null), ("SuitableFor", null),
            ("IsFeatured", 0), ("IsActive", 1), ("SortOrder", 2),
            ("CreatedAt", "2026-09-26 06:47:31.714708"),
            ("UpdatedAt", "2026-09-26 09:41:49.131984"),
            ("Ibn", null),
            // A database that predates the Verification feature still has unminted rows.
            ("VerificationCode", null));

        // ------------------------------------------------------------ ProductImages
        Insert(connection, "ProductImages",
            ("Id", 201), ("ProductId", 101), ("Url", "/products/p1.webp"),
            ("Alt", "Front"), ("SortOrder", 0));

        Insert(connection, "ProductImages",
            ("Id", 202), ("ProductId", 102), ("Url", "/products/p2.webp"),
            ("Alt", null), ("SortOrder", 1));

        // ------------------------------------------------------------- SiteSettings
        Insert(connection, "SiteSettings",
            ("Id", 301), ("Key", "site.name"), ("Value", "Albaik Group"),
            ("Group", "general"), ("Label", "Site name"), ("InputType", "text"),
            ("SortOrder", 0));

        Insert(connection, "SiteSettings",
            ("Id", 302), ("Key", "contact.address"), ("Value", "دفتر مرکزی، کابل"),
            ("Group", "contact"), ("Label", "Head office"), ("InputType", "textarea"),
            ("SortOrder", 0));

        Insert(connection, "SiteSettings",
            ("Id", 303), ("Key", "search.suggestions"),
            ("Value", """[{"label":"Anti-dandruff care","query":"dandruff"}]"""),
            ("Group", "search"), ("Label", "Search suggestion chips"), ("InputType", "json"),
            ("SortOrder", 0));

        // ---------------------------------------------------------------- NavLinks
        Insert(connection, "NavLinks",
            ("Id", 401), ("Label", "Home"), ("Path", "/"), ("Group", null),
            ("OpenInNewTab", 0), ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "NavLinks",
            ("Id", 402), ("Label", "Collections"), ("Path", "/collections"), ("Group", "main"),
            ("OpenInNewTab", 1), ("SortOrder", 2), ("IsActive", 1));

        // ------------------------------------------------------------- FooterLinks
        Insert(connection, "FooterLinks",
            ("Id", 501), ("Group", "Collections"), ("Label", "Hair Care"),
            ("Path", "/collections/hair-care"), ("OpenInNewTab", 0),
            ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "FooterLinks",
            ("Id", 502), ("Group", "Support"), ("Label", "Contact"),
            ("Path", "/contact"), ("OpenInNewTab", 1), ("SortOrder", 1), ("IsActive", 0));

        // -------------------------------------------------------------- QuickLinks
        Insert(connection, "QuickLinks",
            ("Id", 601), ("Label", "All products"), ("Path", "/collections"),
            ("OpenInNewTab", 0), ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "QuickLinks",
            ("Id", 602), ("Label", "Shampoo guide"), ("Path", "/guides/shampoo-guide"),
            ("OpenInNewTab", 0), ("SortOrder", 2), ("IsActive", 1));

        // ------------------------------------------------------------- HomeSections
        Insert(connection, "HomeSections",
            ("Id", 701), ("Key", "hero"), ("SectionType", "hero"), ("Eyebrow", ""),
            ("Title", "The Mark of"), ("Subtitle", "Care that starts with what matters."),
            ("Body", "Body copy with — an em dash."), ("ImageUrl", ""),
            ("PrimaryCtaLabel", "Explore"), ("PrimaryCtaHref", "/collections"),
            ("SecondaryCtaLabel", null), ("SecondaryCtaHref", null),
            ("DataJson", """{"accentWord":"Pure Perfection."}"""),
            ("SlidesJson", """[{"title":"The Mark of","accentWord":"Pure Perfection."}]"""),
            ("SortOrder", 1), ("IsVisible", 1));

        Insert(connection, "HomeSections",
            ("Id", 702), ("Key", "collections"), ("SectionType", "collections"),
            ("Eyebrow", null), ("Title", "Collections"), ("Subtitle", null),
            ("Body", null), ("ImageUrl", null), ("PrimaryCtaLabel", null),
            ("PrimaryCtaHref", null), ("SecondaryCtaLabel", null),
            ("SecondaryCtaHref", null), ("DataJson", null), ("SlidesJson", null),
            ("SortOrder", 2), ("IsVisible", 0));

        // ---------------------------------------------------------------- HeroStats
        Insert(connection, "HeroStats",
            ("Id", 801), ("Value", "4"), ("Label", "Collections"), ("Accent", "gold"),
            ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "HeroStats",
            ("Id", 802), ("Value", "2"), ("Label", "Brands"), ("Accent", null),
            ("SortOrder", 2), ("IsActive", 1));

        // -------------------------------------------------------------- Testimonials
        Insert(connection, "Testimonials",
            ("Id", 901), ("Name", "Test Person"), ("Role", "Customer"), ("Initials", "TP"),
            ("Title", "Great"), ("Quote", "Lovely product"), ("Rating", 5),
            ("AvatarUrl", null), ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "Testimonials",
            ("Id", 902), ("Name", "Hidden Review"), ("Role", null), ("Initials", null),
            ("Title", null), ("Quote", null), ("Rating", 4), ("AvatarUrl", null),
            ("SortOrder", 2), ("IsActive", 0));

        // -------------------------------------------------------------- TrustPillars
        Insert(connection, "TrustPillars",
            ("Id", 1001), ("Icon", "verified_user"), ("Title", "Consistent Quality"),
            ("Subtitle", "Defined formulations"), ("Accent", "secondary"),
            ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "TrustPillars",
            ("Id", 1002), ("Icon", "science"), ("Title", "Verified Information"),
            ("Subtitle", null), ("Accent", null), ("SortOrder", 2), ("IsActive", 1));

        // --------------------------------------------------------------- HairProfiles
        Insert(connection, "HairProfiles",
            ("Id", 1101), ("Key", "dandruff"), ("Icon", "spa"),
            ("Title", "Dandruff & Scalp Care"), ("Badge", "Anti-Dandruff"),
            ("BadgeStyle", "secondary"), ("Description", "Description"),
            ("MetricValue", null), ("MetricLabel", null), ("SortOrder", 1), ("IsActive", 1));

        Insert(connection, "HairProfiles",
            ("Id", 1102), ("Key", "oil"), ("Icon", "water_drop"),
            ("Title", "Excess Oil & Impurities"), ("Badge", "Purify & Cleanse"),
            ("BadgeStyle", "primary"), ("Description", null),
            ("MetricValue", "82%"), ("MetricLabel", "felt refreshed"),
            ("SortOrder", 2), ("IsActive", 0));

        // --------------------------------------------------------------------- Pages
        Insert(connection, "Pages",
            ("Id", 1201), ("Slug", "about"), ("Title", "About Albaik"),
            ("Subtitle", "Company"), ("Eyebrow", "Our Company"),
            ("ContentHtml", "<p>Text with <strong>markup</strong> &amp; entities.</p>"),
            ("MetaDescription", "About meta"), ("SortOrder", 1), ("IsPublished", 1),
            ("CreatedAt", "2026-09-26 06:47:31.854772"),
            ("UpdatedAt", "2026-09-26 06:47:31.854773"));

        Insert(connection, "Pages",
            ("Id", 1202), ("Slug", "privacy"), ("Title", "Privacy Policy"),
            ("Subtitle", null), ("Eyebrow", null), ("ContentHtml", null),
            ("MetaDescription", null), ("SortOrder", 2), ("IsPublished", 0),
            ("CreatedAt", "2026-09-27 06:47:31.854772"),
            ("UpdatedAt", "2026-09-27 06:47:31.854773"));

        // ------------------------------------------------------------ ContactMessages
        Insert(connection, "ContactMessages",
            ("Id", 1301), ("Name", "Habib Rahman"), ("Email", "habib@example.com"),
            ("Phone", "+93 700 111 222"), ("Company", "Rahman Trading"),
            ("Subject", "Wholesale enquiry"), ("Message", "Hello, wholesale pricing please."),
            ("Kind", "product"), ("ProductSlug", "albaik-anti-dandruff-shampoo"),
            ("ProductName", "Albaik Anti-Dandruff Shampoo"),
            ("IsRead", 1), ("EmailDelivered", 0), ("DeliveryError", null),
            ("IpAddress", "::1"), ("CreatedAt", "2026-09-26 07:55:58.856638"));

        Insert(connection, "ContactMessages",
            ("Id", 1302), ("Name", "Newsletter"), ("Email", "news@example.com"),
            ("Phone", null), ("Company", null), ("Subject", null),
            ("Message", "Subscribe"), ("Kind", "newsletter"),
            ("ProductSlug", null), ("ProductName", null),
            ("IsRead", 0), ("EmailDelivered", 1), ("DeliveryError", ""),
            ("IpAddress", "127.0.0.1"), ("CreatedAt", "2026-09-27 08:00:00.000000"));

        // ---------------------------------------------------------------- AdminUsers
        Insert(connection, "AdminUsers",
            ("Id", 1401), ("Username", "admin"), ("Email", "admin@example.com"),
            ("DisplayName", "Fixture Administrator"), ("PasswordHash", passwordHash),
            ("Role", "Admin"), ("IsActive", 1),
            ("CreatedAt", "2026-09-26 06:47:31.878862"),
            ("LastLoginAt", "2026-11-01 05:51:30.073044"));

        return new SqliteImportFixture(
            path,
            passwordHash,
            VerificationCode,
            new Dictionary<string, int>
            {
                ["Categories"] = 2,
                ["Brands"] = 2,
                ["Products"] = 2,
                ["ProductImages"] = 2,
                ["SiteSettings"] = 3,
                ["NavLinks"] = 2,
                ["FooterLinks"] = 2,
                ["QuickLinks"] = 2,
                ["HomeSections"] = 2,
                ["HeroStats"] = 2,
                ["Testimonials"] = 2,
                ["TrustPillars"] = 2,
                ["HairProfiles"] = 2,
                ["Pages"] = 2,
                ["ContactMessages"] = 2,
                ["AdminUsers"] = 1,
            });
    }

    private static void Execute(SqliteConnection connection, string sql)
    {
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }

    private static void Insert(SqliteConnection connection, string table, params (string Column, object? Value)[] values)
    {
        using var command = connection.CreateCommand();
        var columns = string.Join(", ", values.Select(value => Quote(value.Column)));
        var parameters = string.Join(", ", values.Select((_, index) => "$p" + index));

        command.CommandText = $"INSERT INTO {Quote(table)} ({columns}) VALUES ({parameters})";
        for (var index = 0; index < values.Length; index++)
        {
            command.Parameters.AddWithValue("$p" + index, values[index].Value ?? DBNull.Value);
        }

        command.ExecuteNonQuery();
    }

    private static string Quote(string identifier) => "\"" + identifier.Replace("\"", "\"\"") + "\"";

    /// <summary>
    /// The same schema as the live file before the Product search-snippet feature: the
    /// Pages table still has MetaDescription, only Products does not.
    /// </summary>
    private static string SchemaWithoutProductMetaDescription()
    {
        var start = Schema.IndexOf("CREATE TABLE \"Products\"", StringComparison.Ordinal);
        var end = Schema.IndexOf("CREATE TABLE \"ProductImages\"", StringComparison.Ordinal);
        var products = Schema[start..end];
        products = System.Text.RegularExpressions.Regex.Replace(
            products,
            "[ \\t]*\"MetaDescription\" TEXT NULL,\\r?\\n?",
            string.Empty);
        return Schema[..start] + products + Schema[end..];
    }

    private const string Schema =
        """
        CREATE TABLE "Categories" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Slug" TEXT NOT NULL, "Name" TEXT NOT NULL, "NameDari" TEXT NULL,
            "NamePashto" TEXT NULL, "Tagline" TEXT NULL, "Description" TEXT NULL,
            "ImageUrl" TEXT NULL, "Icon" TEXT NULL, "Accent" TEXT NULL,
            "SortOrder" INTEGER NOT NULL, "IsActive" INTEGER NOT NULL,
            "ShowInNav" INTEGER NOT NULL, "CreatedAt" TEXT NOT NULL, "UpdatedAt" TEXT NOT NULL);
        CREATE UNIQUE INDEX "IX_Categories_Slug" ON "Categories" ("Slug");

        CREATE TABLE "Brands" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Slug" TEXT NOT NULL, "Name" TEXT NOT NULL, "Tagline" TEXT NULL,
            "Description" TEXT NULL, "LogoUrl" TEXT NULL, "ImageUrl" TEXT NULL,
            "Accent" TEXT NULL, "CategoryId" INTEGER NOT NULL, "SortOrder" INTEGER NOT NULL,
            "IsActive" INTEGER NOT NULL, "IsFeatured" INTEGER NOT NULL,
            "CreatedAt" TEXT NOT NULL, "UpdatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_Brands_Categories_CategoryId" FOREIGN KEY ("CategoryId")
                REFERENCES "Categories" ("Id") ON DELETE CASCADE);
        CREATE UNIQUE INDEX "IX_Brands_CategoryId_Slug" ON "Brands" ("CategoryId", "Slug");

        CREATE TABLE "Products" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Slug" TEXT NOT NULL, "Name" TEXT NOT NULL, "Subtitle" TEXT NULL,
            "FormulationLabel" TEXT NULL, "ShortDescription" TEXT NULL,
            "Description" TEXT NULL, "MetaDescription" TEXT NULL,
            "CategoryId" INTEGER NOT NULL,
            "BrandId" INTEGER NOT NULL, "Size" TEXT NULL, "Price" decimal(18,2) NULL,
            "CompareAtPrice" decimal(18,2) NULL, "Currency" TEXT NOT NULL,
            "PriceNote" TEXT NULL, "Rating" REAL NULL, "ReviewCount" INTEGER NOT NULL,
            "Badge" TEXT NULL, "BadgeStyle" TEXT NULL, "StockStatus" TEXT NULL,
            "ImageUrl" TEXT NULL, "AccentFrom" TEXT NULL, "AccentTo" TEXT NULL,
            "Benefits" TEXT NOT NULL, "Ingredients" TEXT NOT NULL, "HowToUse" TEXT NULL,
            "SafetyNote" TEXT NULL, "SuitableFor" TEXT NULL,
            "IsFeatured" INTEGER NOT NULL, "IsActive" INTEGER NOT NULL,
            "SortOrder" INTEGER NOT NULL, "CreatedAt" TEXT NOT NULL,
            "UpdatedAt" TEXT NOT NULL, "Ibn" TEXT NULL, "VerificationCode" TEXT NULL,
            CONSTRAINT "FK_Products_Brands_BrandId" FOREIGN KEY ("BrandId")
                REFERENCES "Brands" ("Id") ON DELETE RESTRICT,
            CONSTRAINT "FK_Products_Categories_CategoryId" FOREIGN KEY ("CategoryId")
                REFERENCES "Categories" ("Id") ON DELETE RESTRICT);
        CREATE UNIQUE INDEX "IX_Products_Slug" ON "Products" ("Slug");
        CREATE UNIQUE INDEX "IX_Products_Ibn" ON "Products" ("Ibn");
        CREATE UNIQUE INDEX "IX_Products_VerificationCode" ON "Products" ("VerificationCode");

        CREATE TABLE "ProductImages" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "ProductId" INTEGER NOT NULL, "Url" TEXT NOT NULL, "Alt" TEXT NULL,
            "SortOrder" INTEGER NOT NULL,
            CONSTRAINT "FK_ProductImages_Products_ProductId" FOREIGN KEY ("ProductId")
                REFERENCES "Products" ("Id") ON DELETE CASCADE);

        CREATE TABLE "SiteSettings" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Key" TEXT NOT NULL, "Value" TEXT NULL, "Group" TEXT NOT NULL,
            "Label" TEXT NULL, "InputType" TEXT NOT NULL, "SortOrder" INTEGER NOT NULL);
        CREATE UNIQUE INDEX "IX_SiteSettings_Key" ON "SiteSettings" ("Key");

        CREATE TABLE "NavLinks" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Label" TEXT NOT NULL, "Path" TEXT NOT NULL, "Group" TEXT NULL,
            "OpenInNewTab" INTEGER NOT NULL, "SortOrder" INTEGER NOT NULL,
            "IsActive" INTEGER NOT NULL);

        CREATE TABLE "FooterLinks" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Group" TEXT NOT NULL, "Label" TEXT NOT NULL, "Path" TEXT NOT NULL,
            "OpenInNewTab" INTEGER NOT NULL, "SortOrder" INTEGER NOT NULL,
            "IsActive" INTEGER NOT NULL);

        CREATE TABLE "QuickLinks" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Label" TEXT NOT NULL, "Path" TEXT NOT NULL,
            "OpenInNewTab" INTEGER NOT NULL, "SortOrder" INTEGER NOT NULL,
            "IsActive" INTEGER NOT NULL);

        CREATE TABLE "HomeSections" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Key" TEXT NOT NULL, "SectionType" TEXT NOT NULL, "Eyebrow" TEXT NULL,
            "Title" TEXT NULL, "Subtitle" TEXT NULL, "Body" TEXT NULL,
            "ImageUrl" TEXT NULL, "PrimaryCtaLabel" TEXT NULL, "PrimaryCtaHref" TEXT NULL,
            "SecondaryCtaLabel" TEXT NULL, "SecondaryCtaHref" TEXT NULL,
            "DataJson" TEXT NULL, "SlidesJson" TEXT NULL,
            "SortOrder" INTEGER NOT NULL, "IsVisible" INTEGER NOT NULL);
        CREATE UNIQUE INDEX "IX_HomeSections_Key" ON "HomeSections" ("Key");

        CREATE TABLE "HeroStats" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Value" TEXT NOT NULL, "Label" TEXT NOT NULL, "Accent" TEXT NULL,
            "SortOrder" INTEGER NOT NULL, "IsActive" INTEGER NOT NULL);

        CREATE TABLE "Testimonials" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Name" TEXT NOT NULL, "Role" TEXT NULL, "Initials" TEXT NULL,
            "Title" TEXT NULL, "Quote" TEXT NULL, "Rating" INTEGER NOT NULL,
            "AvatarUrl" TEXT NULL, "SortOrder" INTEGER NOT NULL,
            "IsActive" INTEGER NOT NULL);

        CREATE TABLE "TrustPillars" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Icon" TEXT NOT NULL, "Title" TEXT NOT NULL, "Subtitle" TEXT NULL,
            "Accent" TEXT NULL, "SortOrder" INTEGER NOT NULL, "IsActive" INTEGER NOT NULL);

        CREATE TABLE "HairProfiles" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Key" TEXT NOT NULL, "Icon" TEXT NOT NULL, "Title" TEXT NOT NULL,
            "Badge" TEXT NULL, "BadgeStyle" TEXT NULL, "Description" TEXT NULL,
            "MetricValue" TEXT NULL, "MetricLabel" TEXT NULL,
            "SortOrder" INTEGER NOT NULL, "IsActive" INTEGER NOT NULL);

        CREATE TABLE "Pages" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Slug" TEXT NOT NULL, "Title" TEXT NOT NULL, "Subtitle" TEXT NULL,
            "Eyebrow" TEXT NULL, "ContentHtml" TEXT NULL, "MetaDescription" TEXT NULL,
            "SortOrder" INTEGER NOT NULL, "IsPublished" INTEGER NOT NULL,
            "CreatedAt" TEXT NOT NULL, "UpdatedAt" TEXT NOT NULL);
        CREATE UNIQUE INDEX "IX_Pages_Slug" ON "Pages" ("Slug");

        CREATE TABLE "ContactMessages" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Name" TEXT NOT NULL, "Email" TEXT NOT NULL, "Phone" TEXT NULL,
            "Company" TEXT NULL, "Subject" TEXT NULL, "Message" TEXT NOT NULL,
            "Kind" TEXT NOT NULL, "IsRead" INTEGER NOT NULL,
            "EmailDelivered" INTEGER NOT NULL, "DeliveryError" TEXT NULL,
            "IpAddress" TEXT NULL, "CreatedAt" TEXT NOT NULL,
            "ProductSlug" TEXT NULL, "ProductName" TEXT NULL);

        CREATE TABLE "AdminUsers" (
            "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "Username" TEXT NOT NULL, "Email" TEXT NULL, "DisplayName" TEXT NULL,
            "PasswordHash" TEXT NOT NULL, "Role" TEXT NOT NULL, "IsActive" INTEGER NOT NULL,
            "CreatedAt" TEXT NOT NULL, "LastLoginAt" TEXT NULL);
        CREATE UNIQUE INDEX "IX_AdminUsers_Username" ON "AdminUsers" ("Username");
        """;
}
