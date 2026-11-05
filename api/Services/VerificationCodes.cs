using System.Security.Cryptography;
using System.Text;

namespace Albaik.Api.Services;

/// <summary>
/// Mints and normalises the tokens carried in product QR codes.
///
/// The alphabet is Crockford base32 — the digits and letters that survive being read
/// aloud or typed by a human: no I, L, O or U, so "one" and "zero" cannot be confused
/// with letters. Sixteen characters is 80 bits of entropy, which is far beyond guessing
/// and still short enough that the QR stays small when printed.
///
/// The token is random and stored (docs/adr/0008). It is deliberately *not* derived from
/// the product: a derived code would change the day the signing secret changed, and every
/// label already printed would stop verifying.
/// </summary>
public static class VerificationCodes
{
    private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private const int Length = 16;

    /// <summary>A new, unguessable token.</summary>
    public static string New()
    {
        var chars = new char[Length];
        for (var i = 0; i < Length; i++)
        {
            // RandomNumberGenerator.GetInt32 is uniform and unbiased; % Alphabet.Length is not.
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }
        return new string(chars);
    }

    /// <summary>
    /// Canonical form for lookups: upper case, with anything that is not a base32
    /// character removed. A QR scanner may hand back the URL, and a human may type the
    /// token with hyphens or spaces, so both have to land on the same key.
    /// </summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var sb = new StringBuilder(value.Length);
        foreach (var ch in value.Trim().ToUpperInvariant())
        {
            // Crockford's aliases: O -> 0, I/L -> 1.
            var c = ch switch { 'O' => '0', 'I' => '1', 'L' => '1', _ => ch };
            if (Alphabet.Contains(c)) sb.Append(c);
        }
        return sb.ToString();
    }

    /// <summary>True when a value is a well-formed token (after normalisation).</summary>
    public static bool IsWellFormed(string? value) => Normalize(value).Length == Length;

    /// <summary>Groups a token for display: ABCD-EFGH-JKMN-PQRS.</summary>
    public static string ForDisplay(string code) =>
        string.Join('-', Normalize(code).Chunk(4).Select(c => new string(c)));
}
