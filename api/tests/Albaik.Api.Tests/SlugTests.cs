using Albaik.Api.Services;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Slugs are stored in varchar(200). A long page or product title must not produce a slug
/// that the database rejects (a 500 after validation has already passed).
/// </summary>
public class SlugTests
{
    [Fact]
    public void LongName_IsTruncatedWithinTheColumnWidth()
    {
        var slug = Slug.From(new string('a', 250));

        Assert.InRange(slug.Length, 1, 200);
        Assert.DoesNotContain("--", slug);
        Assert.False(slug.EndsWith('-'));
    }

    [Fact]
    public void LongNameWithWords_TruncatesAtAWordBoundaryWithoutATrailingHyphen()
    {
        var name = string.Join(' ', Enumerable.Repeat("formulation", 30));
        var slug = Slug.From(name);

        Assert.InRange(slug.Length, 1, 200);
        Assert.False(slug.EndsWith('-'));
    }

    [Fact]
    public void OrdinaryName_IsUnchanged()
    {
        Assert.Equal("anti-dandruff-shampoo", Slug.From("Anti Dandruff Shampoo"));
    }
}
