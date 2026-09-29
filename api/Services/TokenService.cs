using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Albaik.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Albaik.Api.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Create(AdminUser user);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    public TokenService(IConfiguration config) => _config = config;

    public (string Token, DateTime ExpiresAt) Create(AdminUser user)
    {
        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = _config["Jwt:Issuer"] ?? "albaik";
        var audience = _config["Jwt:Audience"] ?? "albaik-admin";
        var hours = int.TryParse(_config["Jwt:ExpiryHours"], out var h) ? h : 12;

        var expires = DateTime.UtcNow.AddHours(hours);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role),
            new("displayName", user.DisplayName ?? user.Username),
        };

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)) { KeyId = "albaik-signing-key-v1" },
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
